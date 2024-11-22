const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;  // Cambia este puerto si necesitas uno diferente

// Configuración de express para manejar JSON
app.use(express.json());
app.use(express.static('public'));

// Crear conexión a la base de datos
const db = new sqlite3.Database('inventario.db');

// Crear tabla si no existe
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE,
        nombre TEXT,
        cantidad INTEGER,
        minimo INTEGER,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Obtener todos los productos
app.get('/api/productos', (req, res) => {
    db.all('SELECT * FROM productos ORDER BY fecha DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Añadir nuevo producto
app.post('/api/productos', (req, res) => {
    const { codigo, nombre, cantidad, minimo } = req.body;

    db.run(
        'INSERT INTO productos (codigo, nombre, cantidad, minimo) VALUES (?, ?, ?, ?)',
        [codigo, nombre, cantidad, minimo],
        function(err) {
            if (err) {
                // Si el código ya existe, enviar error
                if (err.message.includes('UNIQUE constraint failed')) {
                    res.status(400).json({ error: 'El código ya existe' });
                    return;
                }
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        }
    );
});

// Actualizar cantidad de un producto
app.put('/api/productos/:id', (req, res) => {
    const { cantidad } = req.body;

    db.run(
        'UPDATE productos SET cantidad = ?, fecha = CURRENT_TIMESTAMP WHERE id = ?',
        [cantidad, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ cambios: this.changes });
        }
    );
});

// Eliminar producto
app.delete('/api/productos/:id', (req, res) => {
    db.run('DELETE FROM productos WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ cambios: this.changes });
    });
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${port}`);
});

// Manejar el cierre de la aplicación
process.on('SIGINT', () => {
    db.close(() => {
        console.log('Base de datos cerrada');
        process.exit(0);
    });
});