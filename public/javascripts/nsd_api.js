var NSDAPI = {};

(function(NSDAPI) {
    function Client(){

    }

    Client.prototype = {
        getNetworkServices: function(context, type){
            var network_service_promise = $.Deferred();

            const url = "ws://localhost:9999/";
            var ws;

            if ("WebSocket" in window) {
                ws = new WebSocket(url);
            } else if ("MozWebSocket" in window) {
                ws = new MozWebSocket(url);
            } else {
                network_service_promise.reject("WebSocket is not supported");
            }

            ws.onopen = function(){
                var params = {
                    "type": "getNetworkServices",
                    "serviceType": type
                };

                ws.send(JSON.stringify(params));
            };

            ws.onmessage = function(event){
                network_service_promise.resolveWith(context, [event.data]);
                ws.close(4500, "finish");
            }.bind(this);

            return network_service_promise;
        },
        uuidCreate: function(){
            var S4 = function() {
                return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
            };
            return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4() +S4());
        }
    };

    NSDAPI.Client = Client;
}(NSDAPI));
