/**
 * This sample demonstrates how to do common operations in temporary signature way
 * on OBS using the OBS SDK for Nodejs.
 */
'use strict';
 
var ObsClient;
try{
	ObsClient = require('./lib/obs');
}catch(e){
	ObsClient = require('../lib/obs');//sample env
}

var events = require('events');
var eventEmitter = new events.EventEmitter();

var is_secure = true;
/*
 * Initialize a obs client instance with your account for accessing OBS
 */
var obs = new ObsClient({
	access_key_id: '*** Provide your Access Key ***',
	secret_access_key: '*** Provide your Secret Key ***',
	server : 'yourdomainname',
	is_secure : is_secure
});

var bucketName = 'my-obs-bucket-demo';
var objectKey = 'my-obs-object-key-demo';

var http = is_secure ? require('https') : require('http');
var urlLib = require('url');
var crypto = require('crypto');

function doAction(msg,method, _url, content,headers){
	var url = urlLib.parse(_url);
	var req = http.request({
		method : method,
		host : url.hostname,
		port : url.port,
		path : url.path,
		rejectUnauthorized : false,
		headers : headers || {}
	});

	req.on('response', 	(serverback) => {
		
		if(serverback.statusCode < 300){
			var buffers = [];
			serverback.on('data', (data) => {
				buffers.push(data);
			}).on('end', () => {
				console.log(msg + ' using temporary signature successfully.');
				console.log('\turl:' + _url);
				buffers = Buffer.concat(buffers);
				if(buffers.length > 0){
					console.log(buffers.toString());
				}
				console.log('\n');
				eventEmitter.emit(msg);
			});
		}else{
			console.log(msg + ' using temporary signature failed!');
			console.log('status:' + serverback.statusCode);
			console.log('\n');
		}
	});

	req.on('error',(err) => {
		console.log(msg + ' using temporary signature failed!');
		console.log(err);
		console.log('\n');
	});
	
	if(content){
		req.write(content);
	}
	req.end();
}

/*
 * Create bucket
 */
let method = 'PUT';
let res = obs.createV2SignedUrlSync({Method : method, Bucket : bucketName});
doAction('Create bucket', method, res['SignedUrl'], null, res['ActualSignedRequestHeaders']);


/*
 * Set/Get/Delete bucket cors
 */
eventEmitter.on('Create bucket', ()=>{
	let method = 'PUT';
	let content  = '<CORSConfiguration><CORSRule><AllowedMethod>PUT</AllowedMethod><AllowedOrigin>http://www.a.com</AllowedOrigin><AllowedHeader>header1</AllowedHeader><MaxAgeSeconds>100</MaxAgeSeconds><ExposeHeader>header2</ExposeHeader></CORSRule></CORSConfiguration>';
	let headers = {};
	headers['Content-Length'] = content.length;
	headers['Content-MD5'] = crypto.createHash('md5').update(content).digest('base64');
	let res = obs.createV2SignedUrlSync({Method : method, Bucket : bucketName, SpecialParam: 'cors', Headers : headers});
	doAction('Set bucket cors', method, res['SignedUrl'], content, res['ActualSignedRequestHeaders']);
});

eventEmitter.on('Set bucket cors', ()=>{
	let method = 'GET';
	let res = obs.createV2SignedUrlSync({Method : method, Bucket : bucketName, SpecialParam: 'cors'});
	doAction('Get bucket cors', method, res['SignedUrl'], null, res['ActualSignedRequestHeaders']);
});


eventEmitter.on('Get bucket cors', ()=>{
	let method = 'DELETE';
	let res = obs.createV2SignedUrlSync({Method : method, Bucket : bucketName, SpecialParam: 'cors'});
	doAction('Delete bucket cors', method, res['SignedUrl'], null, res['ActualSignedRequestHeaders']);
});


/*
 * Create object
 */
eventEmitter.on('Set bucket cors', ()=>{
	let method = 'PUT';
	let content = 'Hello OBS';
	let headers = {};
	headers['Content-Length'] = content.length;
	let res = obs.createV2SignedUrlSync({Method : method, Bucket : bucketName, Key: objectKey, Headers: headers});
	doAction('Create object', method, res['SignedUrl'], content, res['ActualSignedRequestHeaders']);
});


/*
 * Get object
 */
eventEmitter.on('Create object', ()=>{
	let method = 'GET';
	let res = obs.createV2SignedUrlSync({Method : method, Bucket : bucketName, Key: objectKey});
	doAction('Get object', method, res['SignedUrl'], null, res['ActualSignedRequestHeaders']);
});


/*
 * Set/Get object acl
 */
eventEmitter.on('Get object', ()=>{
	let method = 'PUT';
	let headers = {'x-amz-acl' : obs.enums.AclPublicRead};
	let res = obs.createV2SignedUrlSync({Method : method, Bucket : bucketName, Key: objectKey, SpecialParam: 'acl', Headers: headers});
	doAction('Set object acl', method, res['SignedUrl'], null, res['ActualSignedRequestHeaders']);
});

eventEmitter.on('Set object acl', ()=>{
	let method = 'GET';
	let res = obs.createV2SignedUrlSync({Method : method, Bucket : bucketName, Key: objectKey, SpecialParam: 'acl'});
	doAction('Get object acl', method, res['SignedUrl'],  null, res['ActualSignedRequestHeaders']);
});


/*
 * Delete object
 */
eventEmitter.on('Get object acl', ()=>{
	let method = 'DELETE';
	let res = obs.createV2SignedUrlSync({Method : method, Bucket : bucketName, Key: objectKey});
	doAction('Delete object', method, res['SignedUrl'], null, res['ActualSignedRequestHeaders']);
});


/*
 * Delete bucket
 */
eventEmitter.on('Delete object', ()=>{
	let method = 'DELETE';
	let res = obs.createV2SignedUrlSync({Method : method, Bucket : bucketName});
	doAction('Delete bucket', method, res['SignedUrl'], null, res['ActualSignedRequestHeaders']);
});


var process = require('process');
process.on('beforeExit', (code) => {
	obs.close();
});