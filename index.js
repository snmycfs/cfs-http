
//THe idea is keep all server/client initialization logic here in one file and use it in multiple programs
// e.g. QListener,PlantMessenger, QMessenger and PlantListener





module.exports = ({ appName, baseURL, sslOptions, key, logRequestTimes,tokenExpiry }) => {

    const fs = require('fs'),
        axios = require('axios'),
        https = require('https'),
        jwt = require('jsonwebtoken'),
        jwtInternalKey = "w0w"; //hardcoded internal secret. Means we are strictly restricting to only communicate with application that know internal secret
   
    if(!key)
       throw `Cannot initialize. Please set encryption key phrase`

    let jwtExternalKey = key ; //communication key set by application


   tokenExpiry =  tokenExpiry || 50*365*60*60*24; // expires in 50 years;

    const express = require('express'),
        app = express(),
        cors = require('cors');
    let server = null;

    appName = appName || 'QApplication'

    logRequestTimes = logRequestTimes || false;

    app
    .use(express.json({ limit: '500mb' }))
    .use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", req.headers.origin);
        res.header("Access-Control-Allow-Headers", "Content-Type, *");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS, DELETE");
        res.header("Access-Control-Allow-Credentials", true);

        
        if(logRequestTimes)
            req.reqTime = new Date().getTime();

        res.sendSuccess = function (data) {

            if(req.reqTime){
                req.reqTime = new Date().getTime() - req.reqTime;                
                console.log(`DataReceived=> ${req.socket.bytesRead/1000000}MB Time=>${req.reqTime}ms `);
            }

            this.status(200).json({
                code: '',
                message: 'SUCCESS',
                data
            })
        }

        res.sendError = function (err) {
            if (typeof err === 'string')
                err = { code: 'ERROR', message: err };

            if(req.reqTime){
               req.reqTime = new Date().getTime() - req.reqTime;  
               
               console.warn(`DataReceived=> ${req.socket.bytesRead/1000000}MB Time=>${req.reqTime}ms ErrorCode=>${err.code} ErrorMessage=>${err.message}`);
            }    

            this.status(400).json({
                code: err.code || 'ERROR',
                message: err.message || 'An Error occured',
                data: err.data || {}
            });
        }

        if(req.path.toLowerCase() == '/api/test')  //we want to keep test path non-secure so that we can test that application is running
            return next();

        let token = req.headers['x-access-token'];
        jwt.verify(token, jwtInternalKey + jwtExternalKey, function (err, decoded) {
            if(err)
                return res.sendError({ code: 'TOKEN_EXPIRED', message: 'Failed to authenticate token or Token expired. Please make sure that you are using same key.' })   
                
            next();    
        })       
    })
    .use(cors({
        maxAge: 3 * 7 * 24 * 60 * 60 * 1000, //disable preflight for 3 weeks after first call
        optionsSuccessStatus: 200 // some devices choke on 204 
    }))
    .use(express.json()) //works for express v4.16+    



    if (sslOptions) {

        server = require('https').createServer(sslOptions, app)

    }else{

        server = require('http').Server(app);
    }

    let api = {
        axios: null
    };

    if (baseURL) {
        
        let token =  jwt.sign({appName}, jwtInternalKey + jwtExternalKey, {
            expiresIn: tokenExpiry 
        });

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
        api.axios = axios.create({
            baseURL,
            httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
            headers: { 'Content-Type': 'application/json', 'x-access-token': token },
            maxContentLength: Infinity,  //maximum body size
            maxBodyLength: Infinity,  //maximum body size
        });

        api.throwError = function (error,reqTime) {

            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx

                error = error.response;
                error = error.data || error;
                if (typeof error === 'string')
                    error = { code: "ERROR", message: error }



            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                error = {
                    code: 'NO_RESPONSE_RECEIVED',
                    message: `No Response received`
                }

            } else {
                // Something happened in setting up the request that triggered an Error

                if (typeof error === 'string')
                    error = { code: 'ERROR', message: error };

                else {

                    error = {
                        code: err.code || 'ERROR',
                        message: err.message || 'An Error occured',
                        data: err.data || {}
                    };
                }

            }

            if(reqTime){
                reqTime = new Date().getTime() - reqTime;                
                console.warn(` Time=>${reqTime}ms ErrorCode=>${error.code} ErrorMessage=>${error.message}`);
             } 

            throw error;
        }

        api.returnSuccess = function (resp,reqTime) {
            resp = resp.data || resp;

            if(reqTime){
                reqTime = new Date().getTime() - reqTime;                
                console.log(` Time=>${reqTime}ms`);
            }

            if (resp.data)
                return resp.data;

            

            return resp;

        }

        api.post = async function (endpoint, data) {  //we wan't conistent api among programs

            let reqTime = logRequestTimes?new Date().getTime():0;

            try {
                let resp = await api.axios.post(endpoint, data);
                return api.returnSuccess(resp,reqTime)

            } catch (ex) {
                api.throwError(ex,reqTime);
            }
        }

        api.get = async function (endpoint) {  //we wan't conistent api among programs

            let reqTime = logRequestTimes?new Date().getTime():0;

            try {
                let resp = await api.axios.get(endpoint);
                return api.returnSuccess(resp,reqTime)

            } catch (ex) {
                api.throwError(ex,reqTime);
            }
        }

        api.put = async function (endpoint, data) {  //we wan't conistent api among programs
            
            let reqTime = logRequestTimes?new Date().getTime():0;

            try {
                let resp = await api.axios.put(endpoint, data);
                return api.returnSuccess(resp,reqTime)

            } catch (ex) {
                api.throwError(ex,reqTime);
            }
        }

        api.delete = async function (endpoint) {  //we wan't conistent api among programs

            let reqTime = logRequestTimes?new Date().getTime():0;

            try {
                let resp = await api.axios.delete(endpoint);
                return api.returnSuccess(resp,reqTime)

            } catch (ex) {
                api.throwError(ex,reqTime);
            }
        }

    }

    return { server, app, api }
}