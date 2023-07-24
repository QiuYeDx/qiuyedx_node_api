# 网站监控API

## API列表

- `/api/counts`
  - GET请求 *查询指定服务的请求信息*
    - 请求参数:
      - `name`: String类型, 服务名 e.g.`'qrcode'`
      - `api_key`: String类型, 密钥
    - 返回参数:
      - `data`: 对象数组, 指定服务的请求信息 e.g. `[{id: 1, name: 'qrcode', count: 22, ftime: '2023-07-11T15:49:55.000Z', ltime: '2023-07-20T15:38:11.000Z'}]`
  - PUT请求 *更新指定服务的请求信息, count++*
    - 请求参数:
      - `name`: String类型, 服务名 e.g.`'qrcode'`
      - `api_key`: String类型, 密钥
    - 返回参数:
      - `data`: 对象数组, 更新后的指定服务的请求信息 e.g. `[{id: 1, name: 'qrcode', count: 23, ftime: '2023-07-11T15:49:55.000Z', ltime: '2023-07-20T15:38:11.000Z'}]`
- `/api/url/counts`
  - GET请求 *查询指定网页的访问信息*
    - 请求参数:
      - `domain`: String类型, (网页)来源主机域名 e.g. `'nav.qiuyedx.com'`
      - `url[可选]`: String类型, 网页路径 e.g. `'/tools/qrcode'`
      - `api_key`: String类型, 密钥
    - 返回参数(指定url时):
      - `data`: 对象数组, 指定网页的访问信息 e.g. `[{"id": 1,"domain": "test.domain","url": "/tools/QRPage","count": 20,"ftime": "2023-07-20T14:36:23.000Z","ltime": "2023-07-21T07:56:25.000Z"}]`
    - 返回参数(不指定url时): 
      - `data`: 对象数组, 指定`domain`所有网页的访问信息和**全站访问量**`sum_count` e.g.`[{"id": 1,"domain": "test.domain","url": "/tools/QRPage","count": 20,"ftime": "2023-07-20T14:36:23.000Z","ltime": "2023-07-21T07:56:25.000Z", "sum_count": 85 }]`
  - PUT请求 *更新指定网页的访问信息, count++*
    - 请求参数:
      - `domain`: String类型, (网页)来源主机域名 e.g. `'nav.qiuyedx.com'`
      - `url`: String类型, 网页路径 e.g. `'/tools/qrcode'`
      - `api_key`: String类型, 密钥
    - 返回参数:
      - `data`: String类型, 请求状态 e.g. `'OK'`
- `/api/logs`
  - GET请求 *查询指定分页的日志*
    - 请求参数: 
      - `n_per_page`: Number类型, 每页记录的数量
      - `p_index`: Number类型, 要查询的页面索引 [1, 2, ...]
      - `api_key`: String类型, 密钥
    - 返回参数:
      - `data`: 对象数组, 指定分页的日志以及全部日志的数量(用于前端计算总页数等) e.g. `[{
        "id": 1,
        "time": "2023-07-21T10:10:12.000Z",
        "api": "/api/url/counts",
        "params": "{\"domain\":\"test.domain\",\"url\":\"/tools/QRPage\"}",
        "origin": "http://localhost:3000",
        "ip": "127.0.0.1",
        "state": "L",
        "log": "合法的PUT请求, 更新网页访问次数",
        "total_count": 9
        }]`