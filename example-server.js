
 
 const port = 5000;

let { server,app } = require('./index')({
    appName:'ServerTest', 
    //sslOptions: {...}
    logRequestTimes:true,
    key:'very$ecureKey'
}) //if baseUrl is passed then it will become client


app.post('/api/receive', async (req,res) => {
    try{
        let response = await processMessage(req.body)  
        res.sendSuccess(response)   
    } catch(err) {
        res.sendError(err)
    }            
})


server.listen(port, async function(){
    console.log(`Server is listening on ${port}`);
});

async function processMessage(data){
    console.log("we are processing ",data)
    return {success:true}
}


          