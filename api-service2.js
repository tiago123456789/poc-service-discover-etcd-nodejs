require("dotenv").config()
const apiServiceKey = "/services/api2";
const _ = require('underscore');
const express = require('express');
const { Etcd3 } = require('etcd3');
const client = new Etcd3({ hosts: process.env.ETCD_URL });


const config = {
	host: "http://127.0.0.1",
	port: 3001
}

var app = express();

app.get('/fortune', function (req, res) {

	return res.send("Api 2 " + new Date())

});

app.listen(config.port, function () {
	return console.log(`server starting on ${config.host}:${config.port}`);
});

const register = async function () {
	const lease = client.lease(10); // set a TTL of 10 seconds

	lease.on('lost', err => {
		console.log('We lost our lease as a result of this error:', err);
		console.log('Trying to re-grant it...');
		register();
	})

	await lease.put(apiServiceKey).value(JSON.stringify(config))
	console.log(`Registered @ ${apiServiceKey} - ${config.host}:${config.port}`)


}

register();
const registerInterval = setInterval(register, 5000);

process.on('SIGTERM', async () => {
	console.log('SIGTERM signal received.');
	console.log('Closed out remaining connections');
	await client.delete().key(apiServiceKey).exec()
	process.exit(0);
});

process.on('SIGINT', async () => {
	console.log('SIGINT signal received.');
	console.log('Closed out remaining connections');
	await client.delete().key(apiServiceKey).exec()
	process.exit(0);
});