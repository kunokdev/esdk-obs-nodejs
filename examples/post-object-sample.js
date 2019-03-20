/**
 * This sample demonstrates how to post object under specified bucket from
 * OBS using the OBS SDK for Nodejs.
 */
'use strict';
 
var ObsClient;
try{
	ObsClient = require('./lib/obs');
}catch(e){
	ObsClient = require('../lib/obs');//sample env
}

var	server = 'yourdomainname';

/*
 * Initialize a obs client instance with your account for accessing OBS
 */
var obs = new ObsClient({
	access_key_id: '*** Provide your Access Key ***',
	secret_access_key: '*** Provide your Secret Key ***',
	server : server
});


var pathLib = require('path');
var sampleFilePath = '/temp/text.txt';

function mkdirsSync(dirname){
    if(fs.existsSync(dirname)){
        return true;
    }else{
        if(mkdirsSync(pathLib.dirname(dirname))){
            fs.mkdirSync(dirname);
            return true;
        }
    }
}

function createSampleFileSync(sampleFilePath){
	if(!fs.existsSync(sampleFilePath)){
		mkdirsSync(pathLib.dirname(sampleFilePath));
		var fd = fs.openSync(sampleFilePath, 'w');
		if(fd){
			fs.writeSync(fd, String(Math.random()) + '\n');
			fs.writeSync(fd, String(Math.random()) + '\n');
			fs.writeSync(fd, String(Math.random()) + '\n');
			fs.writeSync(fd, String(Math.random()) + '\n');
			fs.closeSync(fd);
		}
	}
	return sampleFilePath;
}

var bucketName = 'my-obs-bucket-demo';
var objectKey = 'my-obs-object-key-demo';

/*
 * Create bucket 
 */
obs.createBucket({
	Bucket : bucketName
}, (err, result) => {
	if(!err && result.CommonMsg.Status < 300){
		console.log('Create bucket for demo\n');
		
		/*
		 * Create sample file
		 */
		createSampleFileSync(sampleFilePath);
		
		/*
		 * Claim a post object request
		 */
		var formParams = {'acl': obs.enums.AclPublicRead, 'content-type': 'text/plain', 'x-amz-meta-meta1': 'value1', 'x-amz-meta-meta2': 'value2'};
		var res = obs.createV4PostSignatureSync({Bucket: bucketName, Key: objectKey, Expires:3600, FormParams: formParams});
		
		/*
		 * Start to post object
		 */
		formParams['key'] = objectKey;
		formParams['policy'] = res['Policy'];
		formParams['x-amz-algorithm'] = res['Algorithm'];
		formParams['x-amz-credential'] = res['Credential'];
		formParams['x-amz-date'] = res['Date'];
		formParams['x-amz-signature'] = res['Signature'];
		
		console.log('Creating object in v4 post way');
		
		var boundary = '9431149156168';
		
		/*
		 * Construct form data
		 */
		var buffers = [];
		var first = true;
		
		var contentLength = 0;
		
		var buffer = [];
		for(let key in formParams){
			if(!first){
				buffer.push('\r\n');
			}else{
				first = false;
			}
			
			buffer.push('--');
			buffer.push(boundary);
			buffer.push('\r\n');
			buffer.push('Content-Disposition: form-data; name="');
			buffer.push(String(key));
			buffer.push('"\r\n\r\n');
			buffer.push(String(formParams[key]));
		}
		
		buffer = buffer.join('');
		contentLength += buffer.length;
		buffers.push(buffer);
		
		/*
		 * Construct file description
		 */
		buffer = [];
		buffer.push('\r\n');
		buffer.push('--');
		buffer.push(boundary);
		buffer.push('\r\n');
		buffer.push('Content-Disposition: form-data; name="file"; filename="');
		buffer.push('myfile');
		buffer.push('"\r\n');
		buffer.push('Content-Type: text/plain');
		buffer.push('\r\n\r\n');
		
		buffer = buffer.join('');
		contentLength += buffer.length;
		buffers.push(buffer);
		
		/*
		 * Contruct end data
		 */
		buffer = [];
		buffer.push('\r\n--');
		buffer.push(boundary);
		buffer.push('--\r\n');
		
		buffer = buffer.join('');
		contentLength += buffer.length;
		buffers.push(buffer);
		
		/*
		 * Add file length to content length
		 */
		contentLength += fs.lstatSync(sampleFilePath).size;
		
		var http = require('http');
		var req = http.request({
			method : 'POST',
			host : server,
			port : 80,
			path : '/' + bucketName,
			headers : {'Content-Length': String(contentLength), 'User-Agent': 'OBS/Test','Content-Type': 'multipart/form-data; boundary=' + boundary}
		});
		
		req.on('response', 	(serverback) => {
			if(serverback.statusCode < 300){
				console.log('Post object successfully.');
			}else{
				console.log('Post object failed!!');
			}
			let buffers = [];
			serverback.on('data', (data) => {
				buffers.push(data);
			}).on('end', () => {
				if(buffers.length > 0){
					console.log(buffers.toString());
				}
				console.log('\n');
			});
			
		}).on('error',(err) => {
			console.log(err);
			console.log('\n');
		});
		
		/*
		 * Send form data
		 */
		req.write(buffers[0]);
		
		/*
		 * Send file description
		 */
		req.write(buffers[1]);
		
		/*
		 * Send file data
		 */
		var readable = fs.createReadStream(sampleFilePath);
		readable.on('data', (data) => {
			req.write(data);
		}).on('end', () => {
			/*
			 * Send end data
			 */
			req.write(buffers[2]);
			req.end();
		}).on('err', ()=>{
			req.abort();
		});
	}
});


var process = require('process');
process.on('beforeExit', (code) => {
	if(fs.existsSync(sampleFilePath)){
		fs.unlinkSync(sampleFilePath);
	}
	obs.close();
});