require("dotenv").config({})
const { Etcd3 } = require('etcd3');
const client = new Etcd3({ hosts: process.env.ETCD_URL });
const apiServiceKey = "/services/api";
const {
    SequentialRoundRobin
} = require('round-robin-js');
const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express()

let loadBalancer = null;

async function setApis() {
    let apis = await client.getAll().prefix(apiServiceKey).json();
    apis = Object.keys(apis).map(key => apis[key])
    loadBalancer = new SequentialRoundRobin(apis)
}

setInterval(setApis, 3000)

app.get("/fortune", async (req, res, next) => {
    const apiConfig = loadBalancer.next().value
    return createProxyMiddleware({
        target: `${apiConfig.host}:${apiConfig.port}`,
        changeOrigin: true,
    })(req, res, next)
})

app.listen(5000, async () => {
    await setApis()
    console.log("Server is running at port 5000")
})

async function main() {
    await setApis()

    client.watch()
        .prefix(apiServiceKey)
        .create()
        .then(async watcher => {
            watcher
                .on('disconnected', () => console.log('disconnected...'))
                .on('connected', () => console.log('successfully reconnected!'))
                .on('put', async _ => {
                    await setApis()
                })
                .on('delete', async _ => {
                    await setApis()
                })

        });

}

main().catch(console.error);
