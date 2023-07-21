const express = require('express');
const mysql = require('mysql');
const config = require('./config'); // config.globalKey是检验密钥 前端用api_key参数传递密钥
const {getFormattedDate} = require("./utils");

const app = express();

const connection = mysql.createConnection(config.config);

// 解析请求体
app.use(express.json());

// 添加允许跨域请求的中间件
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // 允许所有来源的请求
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // 允许的 HTTP 请求方法
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // 允许的请求头
    next();
});

// 启动后端服务器
app.listen(5050, '0.0.0.0', () => {
    console.log('Server is running on port 5050');
});

/**
 * 查询服务使用次数
 *
 * GET /api/counts 查询指定name的服务的有效请求次数
 *
 * 前端请求示例: axios.get('https://api.XXXX.com/api/counts/', {params: {name: 'qrcode', api_key: 'XXX'}}) 第二个参数为config, 其中的params属性就是req.query
 *      .then(res => {const data = res.data;})
 *      .catch(e => {console.log(e);});
 */
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

    console.log(`\n[${getFormattedDate()}] [/api/counts] [L]合法的GET请求, 参数为: \n|---name: ${name} \n|---api_key: ${api_key} \n来自: ${req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]}`);
});

/**
 * 更新服务使用次数
 *
 * PUT /api/counts 指定name的服务的有效请求次数++, 若不存在该name的服务，则创建一条记录并将次数置为1
 *
 * 前端请求示例: axios.put('https://api.XXXX.com/api/counts/', {name: 'qrcode', api_key: 'XXX'}) 第二个参数为data, 即req.body
 *      .then(res => {console.log(res);})
 *      .catch(e => {console.log(e);});
 */
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

    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    putLog('/api/counts', 'PUT', {name, api_key}, req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1], ip, 'L', '合法的PUT请求, 更新数据库中指定name的记录');
    console.log(`\n[${getFormattedDate()}] [/api/counts] [L]合法的PUT请求, 参数为: \n|---name: ${name} \n|---api_key: ${api_key} \n来自: ${req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]}`);
});


/**
 * 查询网页访问次数
 *
 * GET /api/url/counts 查询指定domain和url的网页的有效访问次数
 *
 * 前端请求示例: axios.get('https://api.XXXX.com/api/url/counts/', {params: {domain: 'nav.qiuyedx.com', url: '/tools/qrcode'}}) 第二个参数为config, 其中的params属性就是req.query
 *      .then(res => {const data = res.data;})
 *      .catch(e => {console.log(e);});
 */
app.get('/api/url/counts', (req, res) => {
    const {domain, url} = req.query;

    // 检验参数合法性
    if(!domain){
        console.log('\n' + '[' + getFormattedDate() + '] [/api/url/counts]' + ' [M]参数非法的GET请求, 非法参数为: \n|---domain: ', domain, '\n|---url: ', url, '\n|---来自: ', req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]);
        res.status(400).json({ error: 'Bad request' }); // 参数非法
        return;
    }

    if(!url){   // 若未指定url，仅指定了domain，则返回该domain下所有url的记录
        connection.query(`SELECT domain, SUM(count) AS sum_count FROM url_counts WHERE domain = ?`, [domain], (error, results) => {
            if (error) {
                console.log('Failed to query the database: ', error);
                res.status(500).json({error: 'Failed to query the database'});
            } else {
                res.json(results);  // 前端用res.data获取results
            }
        });
    }else{  // 若指定了url，则查询数据库中指定domain和url的记录
        connection.query(`SELECT * FROM url_counts WHERE url = ? AND domain = ?`, [url, domain], (error, results) => {
            if (error) {
                console.log('Failed to query the database: ', error);
                res.status(500).json({error: 'Failed to query the database'});
            } else {
                res.json(results);  // 前端用res.data获取results, 这里res.data是个长度为零或一的数组
            }
        });
    }

    console.log(`\n[${getFormattedDate()}] [/api/url/counts] [L]合法的GET请求, 参数为: \n|---domain: ${domain} \n|---url: ${url} \n|---来自: ${req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]}`);
});


/**
 * 更新网页访问次数
 *
 * PUT /api/url/counts 指定domain和url的网页的有效访问次数++, 若不存在，则创建一条记录并将次数置为1
 *
 * 前端请求示例: axios.put('https://api.XXXX.com/api/url/counts/', {domain: 'nav.qiuyedx.com', url: '/tools/qrcode'}) 第二个参数为data, 即req.body
 *      .then(res => {console.log(res);})
 *      .catch(e => {console.log(e);});
 */
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

    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    putLog('/api/url/counts', 'PUT', {domain, url}, req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1], ip, 'L', '合法的PUT请求, 更新网页访问次数');
    console.log(`\n[${getFormattedDate()}] [/api/url/counts] [L]合法的PUT请求, 参数为: \n|---domain: ${domain} \n|---url: ${url} \n|---来自: ${req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]}`);
});

/**
 * 查询日志
 *
 * GET /api/logs 查询指定分页的日志
 *
 * @param api_key - 密钥
 * @param n_per_page - 每页数量
 * @param p_index - 第几页
 */
app.get('/api/logs', (req, res) => {
    // 检验请求权身份是否合法
    const {api_key} = req.query;
    if(api_key !== config.globalKey){
        console.log('\n' + '[' + getFormattedDate() + '] [/api/logs]' + ' [M]身份非法的GET请求, api_key为: ' + api_key + '\n|---来自: ', req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]);
        res.status(401).json({ error: 'Unauthorized' }); // 密钥不匹配，返回未经授权的错误响应
        return;
    }

    let {n_per_page, p_index} = req.query;
    n_per_page = parseInt(n_per_page);
    p_index = parseInt(p_index);
    // 检验参数合法性
    if(!n_per_page || !p_index){
        console.log('\n' + '[' + getFormattedDate() + '] [/api/logs]' + ' [M]参数非法的GET请求, 非法参数为: \n|---n_per_page: ', n_per_page, '\n|---p_index: ', p_index, '\n|---来自: ', req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]);
        res.status(400).json({ error: 'Bad request' }); // 参数非法
        return;
    }

    // 查询数据库中指定分页的日志, 同时返回总的记录数量
    connection.query(`SELECT logs.*, total_count.total_count FROM logs CROSS JOIN (SELECT COUNT(*) AS total_count FROM logs) AS total_count LIMIT ? OFFSET ?;`, [n_per_page, (p_index - 1) * n_per_page], (error, results) => {
        if (error) {
            console.log('Failed to query the database: ', error);
            res.status(500).json({error: 'Failed to query the database'});
        } else {
            res.json(results);  // 前端用res.data获取results
        }
    });

    console.log(`\n[${getFormattedDate()}] [/api/logs] [L]合法的GET请求, 参数为: \n|---n_per_page: ${n_per_page} \n|---p_index: ${p_index} \n|---api_key: ${api_key} \n来自: ${req.rawHeaders[req.rawHeaders.indexOf('Origin') + 1]}`);
});

/**
 * ## `putLog()` 将日志写入数据库
 * @param {String} api - 请求的接口 e.g. '/api/counts'
 * @param {String} method - 请求方式 'GET', 'PUT', 'POST', 'DELETE'
 * @param {Object} params - 包含请求参数的对象 e.g. {name: 'qrcode'}
 * @param {String} origin - 请求来源 e.g. 'https://nav.qiuyedx.com/#/tools/qrcode'
 * @param {String} ip - 请求ip e.g. ''
 * @param {String} state - 日志等级 'L', 'M', 'H'
 * @param {String} log - 日志内容与描述 e.g. '合法的PUT请求'
 */
const putLog = (api, method, params, origin, ip, state, log) => {
    const str_params = JSON.stringify(params);
    connection.query('INSERT INTO logs (api, method, params, origin, ip, state, log) VALUES (?, ?, ?, ?, ?, ?, ?)', [api, method, str_params, origin, ip, state, log], (error) => {
        if (error) {
            console.log(`[Error] putLog()失败`, error);
            return false;
        } else {
            return true;
        }
    });
};