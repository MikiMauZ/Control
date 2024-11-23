const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = process.env.PORT || 3000;

// Configuración de express
app.use(express.json());
app.use(express.static('public'));

// Configuración de la base de datos
const dbPath = './inventario.db';  // Simplificamos la ruta
let db = null;

// Función para inicializar la base de datos
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error al conectar con la base de datos:', err);
                reject(err);
                return;
            }
            console.log('Conexión exitosa a la base de datos');

            // Crear tabla si no existe
            db.run(`CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE,
                nombre TEXT,
                cantidad INTEGER,
                minimo INTEGER,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error al crear tabla:', err);
                    reject(err);
                    return;
                }
                console.log('Tabla productos creada o verificada');
                resolve();
            });
        });
    });
}

// Rutas API
app.get('/api/productos', (req, res) => {
    if (!db) {
        res.status(500).json({ error: 'Base de datos no inicializada' });
        return;
    }
    
    db.all('SELECT * FROM productos ORDER BY fecha DESC', [], (err, rows) => {
        if (err) {
            console.error('Error al obtener productos:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/productos', (req, res) => {
    if (!db) {
        res.status(500).json({ error: 'Base de datos no inicializada' });
        return;
    }

    const { codigo, nombre, cantidad, minimo } = req.body;
    db.run(
        'INSERT INTO productos (codigo, nombre, cantidad, minimo) VALUES (?, ?, ?, ?)',
        [codigo, nombre, cantidad, minimo],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    res.status(400).json({ error: 'El código ya existe' });
                    return;
                }
                console.error('Error al insertar producto:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        }
    );
});

app.put('/api/productos/:id', (req, res) => {
    if (!db) {
        res.status(500).json({ error: 'Base de datos no inicializada' });
        return;
    }

    const { cantidad } = req.body;
    db.run(
        'UPDATE productos SET cantidad = ?, fecha = CURRENT_TIMESTAMP WHERE id = ?',
        [cantidad, req.params.id],
        function(err) {
            if (err) {
                console.error('Error al actualizar producto:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ cambios: this.changes });
        }
    );
});

app.delete('/api/productos/:id', (req, res) => {
    if (!db) {
        res.status(500).json({ error: 'Base de datos no inicializada' });
        return;
    }

    db.run('DELETE FROM productos WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            console.error('Error al eliminar producto:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ cambios: this.changes });
    });
});

// Inicialización y manejo de errores
async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(port, '0.0.0.0', () => {
            console.log(`Servidor corriendo en http://0.0.0.0:${port}`);
        });

        // Manejo de cierre graceful
        process.on('SIGINT', () => {
            if (db) {
                db.close(() => {
                    console.log('Base de datos cerrada correctamente');
                    process.exit(0);
                });
            } else {
                process.exit(0);
            }
        });

    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Iniciar el servidor
startServer();
        console.log('Base de datos cerrada');
        process.exit(0);
    });
});
