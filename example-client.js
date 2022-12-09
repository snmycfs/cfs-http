
 


(async () => {

    let { api } = require('./index')({ 
            appName:'ClientTest',
            baseURL:`http://127.0.0.1:5000`,
            logRequestTimes:true,
            key:'very$ecureKey'
    }) 

    let result = await api.post('/api/receive',{foo:'bar'});
    console.log("result retured from server:",result)

})()        