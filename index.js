const express = require('express');
const mysql = require('mysql');

const app = express();

const connection = mysql.createConnection({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '20011216',
    database: 'api'
});

// 解析请求体
app.use(express.json());

// 添加允许跨域请求的中间件
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // 允许所有来源的请求
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // 允许的 HTTP 请求方法
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // 允许的请求头
    next();
});

// GET /api/counts 查询指定name的服务的有效请求次数
// 前端请求示例: axios.get('https://api.XXXX.com/api/counts/', {params: {name: 'qrcode'}})
//      .then(res => {const data = res.data;})
//      .catch(e => {console.log(e);});
app.get('/api/counts', (req, res) => {
    let name = req.query.name;
    console.log('[GET] name: ', name);
    connection.query(`SELECT * FROM counts WHERE name = ?`, [name], (error, results) => {
        if (error) {
            console.log('Failed to query the database: ', error);
            res.status(500).json({error: 'Failed to query the database'});
        } else {
            res.json(results);  // 前端用res.data获取results, 这里res.data是个长度为零或一的数组
        }
    });
});

// PUT /api/counts 指定name的服务的有效请求次数++, 若不存在该name的服务，则创建一条记录并将次数置为1
// 前端请求示例: axios.put('https://api.XXXX.com/api/counts/', {name: 'qrcode'})
//      .then(res => {console.log(res);})
//      .catch(e => {console.log(e);});
app.put('/api/counts', (req, res) => {
    let {name} = req.body;
    console.log('[PUT] name: ', name);
    // 查询数据库中指定url的记录
    connection.query('SELECT * FROM counts WHERE name = ?', [name], (error, results) => {
        if (error) {
            res.status(500).json({error: 'Failed to query the database'});
        } else {
            if (results.length === 0) {
                // 如果记录不存在，则创建新记录
                connection.query('INSERT INTO counts (name, count) VALUES (?, 1)', [name], (error) => {
                    if (error) {
                        res.status(500).json({error: 'Failed to create new record'});
                    } else {
                        res.sendStatus(200);    // 前端获取的res中，res.data是默认值'OK'
                    }
                });
            } else {
                // 如果记录存在，则将计数加一
                connection.query('UPDATE counts SET count = count + 1 WHERE name = ?', [name], (error) => {
                    if (error) {
                        res.status(500).json({error: 'Failed to update the count'});
                    } else {
                        res.sendStatus(200);    // 前端获取的res中，res.data是默认值'OK'
                    }
                });
            }
        }
    });
});

// 启动后端服务器
app.listen(5050, () => {
    console.log('Server is running on port 5050');
});
