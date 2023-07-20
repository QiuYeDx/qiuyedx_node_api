const express = require('express');
const mysql = require('mysql');
const config = require('./config'); // config.globalKey是检验密钥 前端用api_key参数传递密钥
const {getFormattedDate} = require("./utils");

const app = express();

const connection = mysql.createConnection({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '20011216',
    database: 'api'
});

// 密钥检查中间件
// const checkKeyMiddleware = (req, res, next) => {
//     const api_key = req.headers['token']; // 假设密钥在请求头的'token'字段中
//     if (api_key === globalKey) {
//         next(); // 密钥匹配，继续处理请求
//     } else {
//         res.status(401).json({ error: 'Unauthorized' }); // 密钥不匹配，返回未经授权的错误响应
//     }
// };

// 解析请求体
app.use(express.json());

// 添加允许跨域请求的中间件
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // 允许所有来源的请求
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // 允许的 HTTP 请求方法
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // 允许的请求头
    next();
});

// 在路由处理程序之前使用中间件进行密钥检查
// app.use(checkKeyMiddleware);

// 查询服务使用次数
// GET /api/counts 查询指定name的服务的有效请求次数
// 前端请求示例: axios.get('https://api.XXXX.com/api/counts/', {params: {name: 'qrcode', api_key: 'XXX'}}) 第二个参数为config, 其中的params属性就是req.query
//      .then(res => {const data = res.data;})
//      .catch(e => {console.log(e);});
app.get('/api/counts', (req, res) => {
    // 检验请求权身份是否合法
    const {api_key} = req.query;
    if(api_key !== config.globalKey){
        console.log('\n' + '[' + getFormattedDate() + '] [/api/counts]' + ' [M]身份非法的GET请求, api_key为: ' + api_key + '\n|---来自: ', req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]);
        res.status(401).json({ error: 'Unauthorized' }); // 密钥不匹配，返回未经授权的错误响应
        return;
    }

    let name = req.query.name;
    // 检验参数合法性
    if(!name){
        console.log('\n' + '[' + getFormattedDate() + '] [/api/counts]' + ' [M]参数非法的GET请求, 非法参数为: \n|---name: ', name, '\n|---来自: ', req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]);
        res.status(400).json({ error: 'Bad request' }); // 参数非法
        return;
    }

    // 查询数据库中指定name的记录
    connection.query(`SELECT * FROM counts WHERE name = ?`, [name], (error, results) => {
        if (error) {
            console.log('Failed to query the database: ', error);
            res.status(500).json({error: 'Failed to query the database'});
        } else {
            res.json(results);  // 前端用res.data获取results, 这里res.data是个长度为零或一的数组
        }
    });

    console.log(`\n[${getFormattedDate()}] [L]合法的GET请求, 来自: ${req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]}`);
});

// 更新服务使用次数
// PUT /api/counts 指定name的服务的有效请求次数++, 若不存在该name的服务，则创建一条记录并将次数置为1
// 前端请求示例: axios.put('https://api.XXXX.com/api/counts/', {name: 'qrcode', api_key: 'XXX'}) 第二个参数为data, 即req.body
//      .then(res => {console.log(res);})
//      .catch(e => {console.log(e);});
app.put('/api/counts', (req, res) => {
    // 检验请求权身份是否合法
    const {name, api_key} = req.body;
    if(api_key !== config.globalKey){
        console.log('\n' + '[' + getFormattedDate() + '] [/api/counts]' + ' [M]身份非法的PUT请求, api_key为: ' + api_key + '\n|---来自: ', req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]);
        res.status(401).json({ error: 'Unauthorized' }); // 密钥不匹配，返回未经授权的错误响应
        return;
    }

    // 检验参数合法性
    if(!name){
        console.log('\n' + '[' + getFormattedDate() + '] [/api/counts]' + ' [M]参数非法的PUT请求, 非法参数为: \n|---name: ', name, '\n|---来自: ', req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]);
        res.status(400).json({ error: 'Bad request' }); // 参数非法
        return;
    }

    // 更新数据库中指定name的记录
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
    console.log(`\n[${getFormattedDate()}] [L]合法的PUT请求, 来自: ${req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]}`);
});

// 更新网页访问次数
// PUT /api/url/counts 指定domain和url的服务的有效请求次数++, 若不存在，则创建一条记录并将次数置为1
// 前端请求示例: axios.put('https://api.XXXX.com/api/url/counts/', {domain: 'nav.qiuyedx.com', url: '/#/tools/qrcode'}) 第二个参数为data, 即req.body
//      .then(res => {console.log(res);})
//      .catch(e => {console.log(e);});
app.put('/api/url/counts', (req, res) => {
    const {domain, url} = req.body;

    // 检验参数合法性
    if(!domain || !url){
        console.log('\n' + '[' + getFormattedDate() + '] [/api/url/counts]' + ' [M]参数非法的PUT请求, 非法参数为: \n|---domain: ', domain, '\n|---url: ', url, '\n|---来自: ', req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]);
        res.status(400).json({ error: 'Bad request' }); // 参数非法
        return;
    }

    // 更新数据库中指定url的记录
    connection.query('SELECT * FROM url_counts WHERE url = ? AND domain = ?', [url, domain], (error, results) => {
        if (error) {
            res.status(500).json({error: 'Failed to query the database'});
        } else {
            if (results.length === 0) {
                // 如果记录不存在，则创建新记录
                connection.query('INSERT INTO url_counts (url, domain, count) VALUES (?, ?, 1)', [url, domain], (error) => {
                    if (error) {
                        res.status(500).json({error: 'Failed to create new record'});
                    } else {
                        res.sendStatus(200);    // 前端获取的res中，res.data是默认值'OK'
                    }
                });
            } else {
                // 如果记录存在，则将计数加一
                connection.query('UPDATE url_counts SET count = count + 1 WHERE url = ? AND domain = ?', [url, domain], (error) => {
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
