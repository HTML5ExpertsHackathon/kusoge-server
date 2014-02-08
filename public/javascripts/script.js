// room url
var room_no;
(function(){
    var url = location.href;
    $("#room-url").html("<a href='"+url+"' target='_blank'>"+url+"</a>");

    var queries = location.search.slice(1).split("&");
    queries.forEach(function(query) {
        if(query.indexOf("r=") === 0) {
            room_no = query.slice(2);
        }
    });
}());


var ws = null;

function sendDescription(desc) {
    if(ws.isActive()) {
        //JSONに変換しWebSocketに送信
        ws.send(JSON.stringify(desc));
    }
}

var signalling = {
    'offer': onReceiveOffer,
    'answer': onReceiveAnswer,
    'candidate': onReceiveCandidate,
    'bye': onReceiveHangup
}


$("#send form#text").submit(function(e) {
    e.preventDefault();
    var mesg = $(this).find("input[type=text]").val();
    console.log("文字の長さ:" + mesg.length);
    //送信メッセージを描画
    SendText(mesg);

    if(!!mesg === false) return;
    $(this).find("input[name=mesg]").val("");

    if(ws.isActive()) {
        var obj = {"data": "チャット","mesg":mesg};

        text_buff = [];
        SliceText(mesg);
    }
});

// ドラッグドロップからの入力
$("#target").bind("drop", function (e) {
    if(e.preventDefault){
        //リンクをドラッグするときにリンク先に飛ばないようにする
        //デフォルトのアクションは実行されない
        e.preventDefault();
    }
    // ドラッグされたファイル情報を取得
    var files = e.originalEvent.dataTransfer.files;

    console.log(files);

    ReadFile(files[0]);
    $("#target").css("background-color","#efefef");
    $("#target").css("color","#000");
})

    .bind("dragenter", function (e) {
        $("#target").css("background-color","#6C8CD5");
        $("#target").css("color","#efefef");
        return false;
    })

    .bind("dragend", function (e) {
        $("#target").css("background-color","#efefef");
        $("#target").css("color","#000");
        return false;
    })

    .bind("dragleave", function (e) {
        $("#target").css("background-color","#efefef");
        $("#target").css("color","#000");
        return false;
    })

    .bind("dragover", function (e) {
        return false;
    });

var buff = [];
var firstCnt = 0;

function ReadFile(file){
    var reset_obj = {"reset":"リセット"};
    //受信側の変数を初期化
    dataChannel.send(JSON.stringify(reset_obj));
    //初期化
    buff = [];

    firstCnt = 0;

    //ファイルリーダーオブジェクトを生成
    var reader = new FileReader();
    //ファイル読み込み終了後、onloadイベントを開始
    reader.onload  = function(e){
        //ファイルデータが入った配列
        var data = e.target.result;

        RenderSendImg(data);

        //ファイルデータの長さ
        var len = data.length;
        //300文字で分割
        var plen = 300;
        //var buff = [];

        for( var i = 0, l = Math.ceil(len / plen); i < l; i += 1) {
            //300文字取り出して、配列に格納
            var data_ = data.slice(plen * i, plen * (i + 1));
            //seq:シーケンス番号 max:シーケンスの最大値 data:分割された画像データ
            var obj = {"seq": i, "max": l - 1, "data": data_,"format":"画像"};
            // dataChannel.send(JSON.stringify(obj));
            buff.push(obj);
        }

        var i = 0, l = Math.ceil(len / plen);
        var timer = setInterval(function(e) {
            console.log(i);
            if(i === l) {
                if(firstCnt == 0){
                    //1つも送れていないとき始めからやり直し
                    console.log("やりなおし");
                    i = 0;
                }else{
                    //読み込み終了
                    clearInterval(timer);
                    return;
                }
            } else {
                //buffをJSON文字列に変換し、DataChannelに送る
                dataChannel.send(JSON.stringify(buff[i]));
                i += 1;
            }
        }, 75);
    }
    //データURLとしてエンコードされたデータを格納
    reader.readAsDataURL(file);
}
$("#send form#file input[name=file]").change(function(e){
    var file = e.target.files[0];
    ReadFile(file);
});

$("#send form#file").submit(function(e) {
    e.preventDefault();
});

outputToReceive = function(data) {
    //先頭のチェック
    if(data.indexOf("data:image") === 0) {
        $("#receive output").prepend("<ul class='chat'><li class='tag friend'>Friend</li>:<img src='"+data+"'></ul>");
    } else {
        $("#receive output").prepend(data + "<hr>");
    }
}

//テキストデータを入れる配列
var text_buff = [];

function SliceText(text){
    var reset_obj = {"reset":"リセット"};
    //受信側の変数を初期化
    dataChannel.send(JSON.stringify(reset_obj));

    firstCnt = 0;

    //ファイルデータの長さ
    var len = text.length;
    //300文字で分割
    var plen = 300;
    //var buff = [];

    for( var i = 0, l = Math.ceil(len / plen); i < l; i += 1) {
        //300文字取り出して、配列に格納
        var text_ = text.slice(plen * i, plen * (i + 1));
        //seq:シーケンス番号 max:シーケンスの最大値 data:分割された文字データ
        var obj = {"seq": i, "max": l - 1, "data": text_ ,"format":"チャット"};

        text_buff.push(obj);
    }

    var i = 0, l = Math.ceil(len / plen);
    var timer = setInterval(function(e) {
        console.log("text"+i);
        if(i === l) {
            if(firstCnt == 0){
                //1つも送れていないとき始めからやり直し
                console.log("やりなおし");
                i = 0;
            }else{
                //読み込み終了
                clearInterval(timer);
                return;
            }
        } else {
            //text_buffをJSON文字列に変換し、DataChannelに送る
            dataChannel.send(JSON.stringify(text_buff[i]));
            i += 1;
        }
    }, 150);
}
function RenderSendImg(data){
    $("#img_progress img").attr("src",data);
    $("#receive output").prepend("<ul class='chat'><li class='tag you'>You</li>:<img src='"+data+"'></ul>");
}
function SendText(text){
    $("#receive output").prepend("<ul class='chat'><li class='tag you'>You</li>:"+text+"</ul>");
}

function ReceiveText(text){
    $("#receive output").prepend("<ul class='chat'><li class='tag friend'>Friend</li>:"+text+"</ul>");
}

$("#send button").attr("disabled", "disabled");
$("#send-offer").attr("disabled", "disabled");

// WebRTC
/////////////////////////////////////////
var dataChannel;

$("#start").click(createConnection);
$("#search").click(search);
$("#send-offer").click(startSendOffer);

function trace(text) {
    // This function is used for logging.
    if (text[text.length - 1] == '\n') {
        text = text.substring(0, text.length - 1);
    }
    console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

var address = "";
var otherp = "";
var flag = 0;

function search() {
    var client = new NSDAPI.Client();
    client.getNetworkServices(this, "upnp:urn:schemas-ntt-com:service:upnp-packagedapps").then(
        function(retValue){
            var jsonValue = JSON.parse(retValue);

            address = jsonValue.address.split(",")[0];
            console.log(address);
            otherp = jsonValue.port;
            console.log("return");
            console.log(location);


            var string =
                "<br>"+
                "Broker on Web" +
                "<ol>" +
                    "<li id='node'>node</li>" +
                    "</ol>" +
                    "Brokers on LAN" +
                    "<ol>" +
                    "<li id='pack'>local Packaged Apps</li>" +
                    "<li id='upnp'>" + address + ":" + otherp + "</li>" +
                    "</ol>";
            $('#output').html(string);

            event();

            function event(){
                $("#node").click(function(){
                    var string2 =
                        "<br>"+
                            "Broker on Web" +
                            "<ol>" +
                            "<li id='node'><font color='red'>node</font></li>" +
                            "</ol>" +
                            "Brokers on LAN" +
                            "<ol>" +
                            "<li id='pack'>local Packaged Apps</li>" +
                            "<li id='upnp'>" + address + ":" + otherp + "</li>" +
                            "</ol>";
                    flag = 0;
                    $('#output').html(string2);
                    event();
                });
                $("#pack").click(function(){
                    var string2 =
                        "<br>"+
                            "Broker on Web" +
                            "<ol>" +
                            "<li id='node'>node</li>" +
                            "</ol>" +
                            "Brokers on LAN" +
                            "<ol>" +
                            "<li id='pack'><font color='red'>local Packaged Apps</font></li>" +
                            "<li id='upnp'>" + address + ":" + otherp + "</li>" +
                            "</ol>";
                    flag = 0;
                    $('#output').html(string2);
                    flag = 1;
                    event();
                });
                $("#upnp").click(function(){
                    var string2 =
                        "<br>"+
                            "Broker on Web" +
                            "<ol>" +
                            "<li id='node'>node</li>" +
                            "</ol>" +
                            "Brokers on LAN" +
                            "<ol>" +
                            "<li id='pack'>local Packaged Apps</li>" +
                            "<li id='upnp'><font color='red'>" + address + ":" + otherp + "</font></li>" +
                            "</ol>";
                    $('#output').html(string2);
                    flag = 2;
                    event();
                });
            }
        }
    );
}

function createConnection() {
    var target = 'ws://'+  location.host + "/";
    if(flag == 1) target = "ws://127.0.0.1:9999/";
    else if(flag == 2) target = 'ws://'+ address + ":" + otherp + "/";
    console.log(target);
    ws = new WebSocket(target);

    ws.onopen = function(e) {
        console.dir(ws);
        var self = this;
        this.isActive = function(){
            return self.readyState === window.WebSocket.prototype.OPEN;
        }
    };

    ws.onmessage = function(e) {
        var mesg = JSON.parse(e.data);
        console.log(mesg);
        if(!!mesg.type && typeof(signalling[mesg.type]) === "function") {
            signalling[mesg.type](mesg);
        } else {
        }
    };


    var servers = null;
    // var servers = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
    // If you use STUN, indicate stun url except for null
    window.pc = new webkitRTCPeerConnection(servers,
        {optional: [{RtpDataChannels: true}]});
    trace('Created local peer connection object pc');

    try {
        // Reliable Data Channels not yet supported in Chrome
        // Data Channel api supported from Chrome M25.
        // You need to start chrome with  --enable-data-channels flag.
        dataChannel = pc.createDataChannel("DataChannel",{reliable: false});
        //     {reliable: true});
        trace('Created send data channel');
    } catch (e) {
        alert('Failed to create data channel. ' +
            'You need Chrome M25 or later with --enable-data-channels flag');
        trace('Create Data channel failed with exception: ' + e.message);
    }

    //ICEを構築
    pc.onicecandidate = iceCallback1;
    //transportが確立された
    dataChannel.onopen = onDataChannelStateChange;
    //message受信成功
    //dataChannel.onmessage = onDataChannelReceiveMessage;

    dataChannel.onmessage = function(ev){
        var d = JSON.parse(ev.data);
        if(d.data === "再送"){
            //指定されたシーケンスを再送する
            ResendSeq(d);
        }else if(d.format === "チャット"){
            var obj = {"success":"成功","firstCnt":1};
            //初回の送信が一つでもうまくいったことを報告
            dataChannel.send(JSON.stringify(obj));

            //フォーマットを設定
            format = d.format;
            onDataChannelReceiveMessage(ev);
        }else if(d.format === "画像"){
            var obj = {"success":"成功","firstCnt":1};
            //初回の送信が一つでもうまくいったことを報告
            dataChannel.send(JSON.stringify(obj));

            //フォーマットを設定
            format = d.format;
            onDataChannelReceiveMessage(ev);
        }else if(d.success === "成功"){
            if(d.firstCnt != 1){
                console.log("firstCnt初期化");
            }
            firstCnt = d.firstCnt;
        }else if(d.progress === "進行状況"){
            $("progress").attr("value",d.ratio);
        }else if(d.reset === "リセット"){
            //受信側の変数を初期化
            imgCnt = 0;
            recvCnt = 0;
            recvBuff = [];
            console.log("受信側の変数を初期化");
        }

    }

    //信頼性を表示
    console.log("reliable:"+dataChannel.reliable);
    //エラー処理
    dataChannel.onerror = function(){
        console.log("失敗したよ");
    }
    dataChannel.onclose = onDataChannelStateChange;

    $("#start").attr("disabled", "disabled");
    $("#send-offer").attr("disabled", false);
}

function startSendOffer(){
    pc.createOffer(function(desc){
        trace("create Offer succeed. Send it to peer.");
        pc.setLocalDescription(desc);
        sendDescription(desc);
    });
}

function onReceiveOffer(desc) {
    trace("Receive Offer from peer.");
    pc.setRemoteDescription(new RTCSessionDescription(desc));
    pc.createAnswer(function(desc_) {
        trace("Create Answer succeeded. Send it to peer.");
        pc.setLocalDescription(desc_);
        sendDescription(desc_);
    });
}

function onReceiveAnswer(desc){
    trace("Receive Answer from peer.");
    pc.setRemoteDescription(new RTCSessionDescription(desc));
}

function onReceiveCandidate(desc){
    trace("Receive Candidate from peer.");
    var candidate = new RTCIceCandidate({sdpMLineIndex:desc.label, candidate:desc.candidate});
    pc.addIceCandidate(candidate);
}

function onReceiveHangup(desc){
    trace("Receive Hangup from peer.");
    pc.close();
    pc = null;
}

function iceCallback1(event) {
    if (event.candidate) {
        trace("Found candidate. Send it to peer.");
        sendDescription({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        });
    } else {
        trace("End of candidate");
    }
}

function onDataChannelStateChange() {
    var readyState = dataChannel.readyState;
    if(readyState === "open"){
        $("#send-offer").attr("disabled", "disabled");
        $("#send button").attr("disabled", false);
    }
    trace('Send channel state is: ' + readyState);
}

function ResendSeq(obj){
    //不足シーケンスが入った配列
    lack_seq = obj.lack;

    for(var i = 0;i < lack_seq.length;i++){
        //console.log(lack_seq[i]+"を再送します");
        var index = lack_seq[i];

        //不足シーケンスを再送する
        if(obj.format == "画像"){//画像送信
            console.log("【画像】再送信中");
            dataChannel.send(JSON.stringify(buff[index]));
        }else{//チャット送信
            console.log("【チャット】再送信中");
            dataChannel.send(JSON.stringify(text_buff[index]));
        }
    }
}

function RequestLackOfSeq(lack_seq){
    var obj = {"data": "再送","lack":lack_seq,"format":format};
    //再送テストメッセージを送る
    dataChannel.send(JSON.stringify(obj));
}

function GetLackOfSeq(){
    //不足シーケンスを入れる配列
    var lack_seq = [];
    for(var i = 0;i < recvBuff.length;i++){
        if(typeof recvBuff[i] === "undefined"){
            //不足シーケンスを格納
            lack_seq.push(i);
        }
    }
    return lack_seq;
}

function Timer(start_time){
    var X = 300;
    var current_time,first_time_stamp;
    //開始時のカウント数
    var start_cnt = recvCnt;

    var timer = setInterval(function(e){
        //現在時刻を取得
        current_time = Date.now();

        //指定時間を超えると受信側から再送要求
        if(current_time - start_time > X && lackCnt > 0){
            //不足シーケンスの取得
            var lack_seq = GetLackOfSeq();
            console.log("再送要求をします");
            //不足シーケンスを再送要求
            RequestLackOfSeq(lack_seq);
            //タイマーストップ
            clearInterval(timer);
            //初回の再送要求に対してのタイムスタンプの発行
            first_time_stamp = Date.now();
            //タイマースタート
            Timer(first_time_stamp);
        }

        //カウントが増えた場合
        if(recvCnt - start_cnt == 1){
            //タイマー終了
            clearInterval(timer);
        }
    },1);
}

//受信データを入れる配列
var recvBuff = [];
//受信成功カウンター
var recvCnt = 0;
//不足シーケンスを数えるカウンター
var lackCnt = 0;

var imgCnt = 0;

var format;

function onDataChannelReceiveMessage(ev){
    //受信データログ
    console.log(ev);

    //受信したJSONを解析
    var data = JSON.parse(ev.data);

    //受信成功カウンターを増加
    recvCnt++;

    //初回受信の場合
    if(recvCnt == 1){
        //シーケンスの最大値だけ配列を作成
        recvBuff.length = data.max + 1;
    }

    //不足シーケンスがある場合だけタイムスタンプを発行
    if(lackCnt > 0 || recvCnt == 1){
        //タイムスタンプの発行
        var time_stamp = Date.now();
        //タイマースタート
        Timer(time_stamp);
    }

    //配列のindex番号とseqを対応させる
    recvBuff[data.seq] = data.data;

    //カウンターを初期化
    lackCnt = 0;

    //不足シーケンスをカウント
    for(var i = 0;i < recvBuff.length;i++){
        if(typeof recvBuff[i] === "undefined"){
            lackCnt++;
        }
    }
    //割合の計算
    var ratio = ((recvBuff.length - lackCnt) / recvBuff.length) * 10000 | 0;
    ratio = ratio / 100;

    console.log("recvCnt"+recvCnt);
    console.log("取得シーケンス数" + (-lackCnt+recvBuff.length));
    console.log("不足シーケンス数" + lackCnt + "現在" + ratio + "%");

    //進行状況のプログレスバー
    $("progress").attr("value",ratio);
    //進行状況を送信側に報告
    var obj = {"progress":"進行状況","ratio":ratio};
    dataChannel.send(JSON.stringify(obj));

    //不足シーケンスがない場合
    if(lackCnt == 0){
        imgCnt++;
        console.log("imgCnt"+imgCnt);
        //初回だけ画像を描画
        if(imgCnt == 1){
            console.log("不足はありませんでした");

            if(format == "画像"){
                //区切り文字をなくし、すべてを連結する
                outputToReceive(recvBuff.join(""));
            }else{
                ReceiveText(recvBuff.join(""));
            }
        }
    }
//  outputToReceive(ev);
}
