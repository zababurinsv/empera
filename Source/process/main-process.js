/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.PROCESS_NAME = "MAIN";
const fs = require('fs');
const os = require('os');
require("../core/constant");
const crypto = require('crypto');
global.START_SERVER = 1;
global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);
console.log("DATA DIR: " + global.DATA_PATH);
console.log("PROGRAM DIR: " + global.CODE_PATH);
require("../core/library");
ToLog(os.platform() + " (" + os.arch() + ") " + os.release());
var VerArr = process.versions.node.split('.');
ToLog("nodejs: " + process.versions.node);
if(VerArr[0] < 8)
{
    ToError("Error version of NodeJS=" + VerArr[0] + "  Pls, download new version from www.nodejs.org and update it. The minimum version must be 8");
    process.exit();
}
var CServer = require("../core/server");
const DEF_PERIOD_SIGN_LIB = 500;
setTimeout(function ()
{
    TestSignLib(DEF_PERIOD_SIGN_LIB);
}
, 4000);
global.glCurNumFindArr = 0;
global.ArrReconnect = [];
global.ArrConnect = [];
var FindList = [{"ip":"91.235.136.81", "port":30000}, {"ip":"dappsgate.com", "port":30000}, {"ip":"185.240.243.182", "port":30000},
    {"ip":"t1.teraexplorer.com", "port":30000}, {"ip":"t2.teraexplorer.com", "port":30000}, {"ip":"t4.teraexplorer.com", "port":30000},
    {"ip":"teraexplorer.org", "port":30000}, ];
if(global.LOCAL_RUN)
{
    FindList = [{"ip":"127.0.0.1", "port":50001}, {"ip":"127.0.0.1", "port":50002}];
}
else
    if(global.TEST_NETWORK)
    {
        FindList = [{"ip":"149.154.70.158", "port":40000}, ];
    }
if(global.FORK_MODE)
{
    if(global.FORK_IP_LIST)
        FindList = global.FORK_IP_LIST;
    else
        FindList = [];
}
global.SERVER = undefined;
global.NeedRestart = 0;
process.on('uncaughtException', function (err)
{
    if(global.PROCESS_NAME !== "MAIN")
    {
        process.send({cmd:"log", message:err});
    }
    ToError(err.stack);
    ToLog(err.stack);
    if(err.code === "ENOTFOUND" || err.code === "ECONNRESET" || err.code === "EPIPE")
    {
    }
    else
    {
        TO_ERROR_LOG("APP", 666, err);
        ToLog("-----------------EXIT------------------");
        process.exit();
    }
}
);
process.on('error', function (err)
{
    ToError(err.stack);
    ToLog(err.stack);
}
);
var ArrChildProcess = [];
var WebProcess = {Name:"WEB PROCESS", idInterval:0, idInterval1:0, idInterval2:0, LastAlive:Date.now(), Worker:undefined, Path:"./process/web-process.js",
    OnMessage:OnMessageWeb, PeriodAlive:10 * 1000};
global.WEB_PROCESS = WebProcess;
if(global.HTTP_HOSTING_PORT && !global.NWMODE)
{
    ArrChildProcess.push(WebProcess);
    WebProcess.idInterval1 = setInterval(function ()
    {
        if(WebProcess.Worker && WebProcess.Worker.connected)
        {
            try
            {
                WebProcess.Worker.send({cmd:"Stat", Name:"MAX:ALL_NODES", Value:global.CountAllNode});
            }
            catch(e)
            {
                WebProcess.Worker = undefined;
            }
        }
    }, 500);
    WebProcess.idInterval2 = setInterval(function ()
    {
        if(WebProcess.Worker && WebProcess.Worker.connected)
        {
            var arr = SERVER.GetDirectNodesArray(true, true).slice(1, 500);
            var arr2 = [];
            var CurTime = GetCurrentTime() - 0;
            for(var i = 0; i < SERVER.NodesArr.length; i++)
            {
                var Item = SERVER.NodesArr[i];
                if(Item.LastTime && (CurTime - Item.LastTime) < NODES_DELTA_CALC_HOUR * 3600 * 1000)
                    arr2.push({ip:Item.ip, port:Item.port, webport:Item.webport});
                else
                    if(Item.LastTimeGetNode && (CurTime - Item.LastTimeGetNode) < NODES_DELTA_CALC_HOUR * 3600 * 1000)
                        arr2.push({ip:Item.ip, port:Item.port, webport:Item.webport});
            }
            WebProcess.Worker.send({cmd:"NodeList", Value:arr, ValueAll:arr2});
        }
    }, 5000);
}
function OnMessageWeb(msg)
{
    switch(msg.cmd)
    {
        case "SetSmartEvent":
            {
                if(global.TX_PROCESS && global.TX_PROCESS.Worker)
                {
                    global.TX_PROCESS.Worker.send(msg);
                }
                break;
            }
    }
}
function AddTransactionFromWeb(Params)
{
    var body = GetArrFromHex(Params.HexValue);
    if(global.TX_PROCESS && global.TX_PROCESS.Worker)
    {
        var StrHex = GetHexFromArr(sha3(body));
        global.TX_PROCESS.Worker.send({cmd:"FindTX", TX:StrHex, Web:1, WebID:Params.WebID});
    }
    var Res = SERVER.AddTransaction({body:body}, 1);
    var text = AddTrMap[Res];
    var final = false;
    if(Res <= 0 && Res !==  - 3)
        final = true;
    ToLogClient("Send: " + text, GetHexFromArr(sha3(body)), final);
    return Res;
}
global.AddTransactionFromWeb = AddTransactionFromWeb;
global.STATIC_PROCESS = {Name:"STATIC PROCESS", NodeOnly:1, idInterval:0, idInterval1:0, idInterval2:0, LastAlive:Date.now(),
    Worker:undefined, Path:"./process/static-process.js", OnMessage:OnMessageStatic, PeriodAlive:50000};
ArrChildProcess.push(STATIC_PROCESS);
function OnMessageStatic(msg)
{
    switch(msg.cmd)
    {
        case "Send":
            {
                var Node = SERVER.NodesMap[msg.addrStr];
                if(Node)
                {
                    msg.Data = msg.Data.data;
                    SERVER.Send(Node, msg, 1);
                }
                break;
            }
    }
}
global.TX_PROCESS = {Name:"TX PROCESS", NodeOnly:1, idInterval:0, idInterval1:0, idInterval2:0, LastAlive:Date.now(), Worker:undefined,
    Path:"./process/tx-process.js", OnMessage:OnMessageTX, PeriodAlive:100 * 1000};
ArrChildProcess.push(TX_PROCESS);
function OnMessageTX(msg)
{
    switch(msg.cmd)
    {
        case "DappEvent":
            {
                if(WebProcess && WebProcess.Worker)
                {
                    WebProcess.Worker.send(msg);
                }
                AddDappEventToGlobalMap(msg.Data);
                break;
            }
    }
}
function StartAllProcess(bClose)
{
    for(var i = 0; i < ArrChildProcess.length; i++)
    {
        var Item = ArrChildProcess[i];
        StartChildProcess(Item);
    }
    if(bClose)
        setInterval(function ()
        {
            if(global.DApps && DApps.Accounts)
            {
                DApps.Accounts.Close();
                DApps.Smart.DBSmart.Close();
            }
            if(WALLET && WALLET.DBHistory)
                WALLET.DBHistory.Close();
        }, 500);
}
var GlobalRunID = 0;
var GlobalRunMap = {};
function StartChildProcess(Item)
{
    if(Item.NodeOnly && global.NET_WORK_MODE && NET_WORK_MODE.NOT_RUN)
    {
        return ;
    }
    let ITEM = Item;
    ITEM.idInterval = setInterval(function ()
    {
        var Delta0 = Date.now() - ITEM.LastAlive;
        if(Delta0 >= 0)
        {
            var Delta = Date.now() - ITEM.LastAlive;
            if(ITEM.Worker && Delta > ITEM.PeriodAlive)
            {
                if(ITEM.Worker)
                {
                    ToLog("KILL PROCESS " + ITEM.Name + ": " + ITEM.Worker.pid);
                    try
                    {
                        process.kill(ITEM.Worker.pid, 'SIGKILL');
                    }
                    catch(e)
                    {
                        ToLog("ERR KILL");
                    }
                    ITEM.Worker = undefined;
                }
            }
            if(!ITEM.Worker)
            {
                ITEM.LastAlive = (Date.now()) + ITEM.PeriodAlive * 3;
                ToLog("STARTING " + ITEM.Name);
                ITEM.Worker = Fork(ITEM.Path, ["READONLYDB"]);
                ITEM.pid = ITEM.Worker.pid;
                ToLog("STARTED " + ITEM.Name + ":" + ITEM.pid);
                ITEM.Worker.on('message', function (msg)
                {
                    if(ITEM.LastAlive < Date.now())
                        ITEM.LastAlive = Date.now();
                    switch(msg.cmd)
                    {
                        case "call":
                            var Err = 0;
                            var Ret;
                            try
                            {
                                if(typeof msg.Params === "object" && msg.Params.F)
                                {
                                    global[msg.Name](msg.Params, function (Err,Ret)
                                    {
                                        if(msg.id && ITEM.Worker)
                                            ITEM.Worker.send({cmd:"retcall", id:msg.id, Err:Err, Params:Ret});
                                    });
                                    break;
                                }
                                else
                                {
                                    Ret = global[msg.Name](msg.Params);
                                }
                            }
                            catch(e)
                            {
                                Err = 1;
                                Ret = "" + e;
                            }
                            if(msg.id && ITEM.Worker)
                                ITEM.Worker.send({cmd:"retcall", id:msg.id, Err:Err, Params:Ret});
                            break;
                        case "retcall":
                            var F = GlobalRunMap[msg.id];
                            if(F)
                            {
                                delete GlobalRunMap[msg.id];
                                F(msg.Err, msg.Params);
                            }
                            break;
                        case "log":
                            ToLog(msg.message);
                            break;
                        case "ToLogClient":
                            if(WebProcess && WebProcess.Worker)
                            {
                                WebProcess.Worker.send(msg);
                            }
                            ToLogClient(msg.Str, msg.StrKey, msg.bFinal);
                            break;
                        case "RetFindTX":
                            if(WebProcess && WebProcess.Worker)
                            {
                                WebProcess.Worker.send(msg);
                                if(msg.Web)
                                    break;
                            }
                            ToLogClient(msg.ResultStr, msg.TX, msg.bFinal);
                            break;
                        case "online":
                            if(ITEM.Worker)
                                ToLog("RUNNING " + ITEM.Name + " : " + msg.message + " pid: " + ITEM.Worker.pid);
                            break;
                        case "WriteBodyResult":
                            var Block = SERVER.ReadBlockDB(msg.BlockNum);
                            if(Block)
                            {
                                Block.arrContentResult = msg.arrContentResult;
                                SERVER.WriteBodyResultDB(Block);
                            }
                            break;
                        default:
                            if(ITEM.OnMessage)
                            {
                                ITEM.OnMessage(msg);
                            }
                            break;
                    }
                });
                ITEM.Worker.on('error', function (err)
                {
                });
                ITEM.Worker.on('close', function (code)
                {
                    ToError("CLOSE " + ITEM.Name);
                });
            }
        }
        if(ITEM.Worker)
        {
            ITEM.Worker.send({cmd:"Alive", DELTA_CURRENT_TIME:DELTA_CURRENT_TIME});
        }
    }, 500);
    ITEM.RunRPC = function (Name,Params,F)
    {
        if(!ITEM.Worker)
            return ;
        if(F)
        {
            GlobalRunID++;
            try
            {
                ITEM.Worker.send({cmd:"call", id:GlobalRunID, Name:Name, Params:Params});
                GlobalRunMap[GlobalRunID] = F;
            }
            catch(e)
            {
            }
        }
        else
        {
            ITEM.Worker.send({cmd:"call", id:0, Name:Name, Params:Params});
        }
    };
}
global.StopChildProcess = function ()
{
    for(var i = 0; i < ArrChildProcess.length; i++)
    {
        var Item = ArrChildProcess[i];
        if(Item.idInterval)
            clearInterval(Item.idInterval);
        Item.idInterval = 0;
        if(Item.idInterval1)
            clearInterval(Item.idInterval1);
        Item.idInterval1 = 0;
        if(Item.idInterval2)
            clearInterval(Item.idInterval2);
        Item.idInterval2 = 0;
        if(Item.Worker && Item.Worker.connected)
        {
            Item.Worker.send({cmd:"Exit"});
            Item.Worker = undefined;
        }
    }
    RunStopPOWProcess("STOP");
}
require("../core/html-server");
RunServer();
setInterval(function run1()
{
    DoConnectToNodes(ArrReconnect, "RECONNECT");
}
, 200);
setInterval(function run2()
{
    DoGetNodes();
    DoConnectToNodes(ArrConnect, "CONNECT");
}
, 500);
var StartCheckMining = 0;
global.MiningPaused = 0;
var ProcessMemorySize = 0;
global.ArrMiningWrk = [];
var BlockMining;
if(global.ADDRLIST_MODE)
{
    return ;
}
function AllAlive()
{
    for(var i = 0; i < ArrMiningWrk.length; i++)
    {
        ArrMiningWrk[i].send({cmd:"Alive", DELTA_CURRENT_TIME:DELTA_CURRENT_TIME});
    }
}
function ClearArrMining()
{
    for(var i = 0; i < ArrMiningWrk.length; i++)
    {
        ArrMiningWrk[i].send({cmd:"Exit"});
    }
    ArrMiningWrk = [];
}
function RunStopPOWProcess(Mode)
{
    if(!GetCountMiningCPU() || GetCountMiningCPU() <= 0)
        return ;
    if(!StartCheckMining)
    {
        StartCheckMining = 1;
        setInterval(RunStopPOWProcess, CHECK_RUN_MINING);
        setInterval(AllAlive, 1000);
    }
    if(global.NeedRestart)
        return ;
    if(global.USE_MINING && global.MINING_START_TIME && global.MINING_PERIOD_TIME)
    {
        var Time = GetCurrentTime();
        var TimeCur = Time.getUTCHours() * 3600 + Time.getUTCMinutes() * 60 + Time.getUTCSeconds();
        var StartTime = GetSecFromStrTime(global.MINING_START_TIME);
        var RunPeriod = GetSecFromStrTime(global.MINING_PERIOD_TIME);
        var TimeEnd = StartTime + RunPeriod;
        global.MiningPaused = 1;
        if(TimeCur >= StartTime && TimeCur <= TimeEnd)
        {
            global.MiningPaused = 0;
        }
        else
        {
            StartTime -= 24 * 3600;
            TimeEnd -= 24 * 3600;
            if(TimeCur >= StartTime && TimeCur <= TimeEnd)
            {
                global.MiningPaused = 0;
            }
        }
        if(ArrMiningWrk.length && global.MiningPaused)
        {
            ToLog("------------ MINING MUST STOP ON TIME");
            ClearArrMining();
            return ;
        }
        else
            if(!ArrMiningWrk.length && !global.MiningPaused)
            {
                ToLog("*********** MINING MUST START ON TIME");
            }
            else
            {
                return ;
            }
    }
    else
    {
        global.MiningPaused = 0;
    }
    if(!global.USE_MINING || Mode === "STOP")
    {
        ClearArrMining();
        return ;
    }
    if(global.USE_MINING && ArrMiningWrk.length)
        return ;
    if(SERVER.LoadHistoryMode)
        return ;
    if(GENERATE_BLOCK_ACCOUNT < 8)
        return ;
    var PathMiner = GetCodePath("../miner.js");
    if(!fs.existsSync(PathMiner))
        PathMiner = "./process/pow-process.js";
    if(ArrMiningWrk.length >= GetCountMiningCPU())
        return ;
    if(GrayConnect())
    {
        ToLog("CANNOT START MINER IN NOT DIRECT IP MODE");
        return ;
    }
    var Memory;
    if(global.SIZE_MINING_MEMORY)
        Memory = global.SIZE_MINING_MEMORY;
    else
    {
        Memory = os.freemem() - (512 + GetCountMiningCPU() * 100) * 1024 * 1014;
        if(Memory < 0)
        {
            ToLog("Not enough memory to start processes.");
            return ;
        }
    }
    ProcessMemorySize = Math.trunc(Memory / GetCountMiningCPU());
    ToLog("START MINER PROCESS COUNT: " + GetCountMiningCPU() + " Memory: " + ProcessMemorySize / 1024 / 1024 + " Mb for each process");
    for(var R = 0; R < GetCountMiningCPU(); R++)
    {
        let Worker = Fork(PathMiner);
        ArrMiningWrk.push(Worker);
        Worker.Num = ArrMiningWrk.length;
        Worker.on('message', function (msg)
        {
            if(msg.cmd === "log")
            {
                ToLog(msg.message);
            }
            else
                if(msg.cmd === "online")
                {
                    Worker.bOnline = true;
                    ToLog("RUNNING PROCESS:" + Worker.Num + ":" + msg.message);
                }
                else
                    if(msg.cmd === "POW")
                    {
                        SERVER.MiningProcess(msg);
                    }
                    else
                        if(msg.cmd === "HASHRATE")
                        {
                            ADD_HASH_RATE(msg.CountNonce);
                        }
        });
        Worker.on('error', function (err)
        {
            if(!ArrMiningWrk.length)
                return ;
            ToError('ERROR IN PROCESS: ' + err);
        });
        Worker.on('close', function (code)
        {
            ToLog("STOP PROCESS: " + Worker.Num + " pid:" + Worker.pid);
            for(var i = 0; i < ArrMiningWrk.length; i++)
            {
                if(ArrMiningWrk[i].pid === Worker.pid)
                {
                    ToLog("Delete wrk from arr - pid:" + Worker.pid);
                    ArrMiningWrk.splice(i, 1);
                }
            }
        });
    }
}
function SetCalcPOW(Block,cmd)
{
    if(!global.USE_MINING)
        return ;
    if(ArrMiningWrk.length !== GetCountMiningCPU())
        return ;
    BlockMining = Block;
    for(var i = 0; i < ArrMiningWrk.length; i++)
    {
        var CurWorker = ArrMiningWrk[i];
        if(!CurWorker.bOnline)
            continue;
        CurWorker.send({cmd:cmd, BlockNum:Block.BlockNum, Account:GENERATE_BLOCK_ACCOUNT, MinerID:GENERATE_BLOCK_ACCOUNT, SeqHash:Block.SeqHash,
            Hash:Block.Hash, PrevHash:Block.PrevHash, Time:Date.now(), Num:CurWorker.Num, RunPeriod:global.POWRunPeriod, RunCount:global.POW_RUN_COUNT,
            Percent:global.POW_MAX_PERCENT, CountMiningCPU:GetCountMiningCPU(), ProcessMemorySize:ProcessMemorySize, });
    }
}
global.SetCalcPOW = SetCalcPOW;
global.RunStopPOWProcess = RunStopPOWProcess;
function DoGetNodes()
{
    if(!SERVER)
        return ;
    if(!GrayConnect() && SERVER.CanSend < 2)
        return ;
    if(!SERVER.NodesArrUnSort || !SERVER.NodesArrUnSort.length)
        return ;
    var Num = glCurNumFindArr % SERVER.NodesArrUnSort.length;
    var Node = SERVER.NodesArrUnSort[Num];
    if(Num === 0)
        glCurNumFindArr = 0;
    glCurNumFindArr++;
    if(Node.Delete)
        return ;
    if(SERVER.NodeInBan(Node))
        return ;
    if(SERVER.BusyLevel && Node.BlockProcessCount <= SERVER.BusyLevel)
        return ;
    if(GetSocketStatus(Node.Socket) === 100)
    {
        SERVER.StartGetNodes(Node);
    }
}
function DoConnectToNodes(Arr,Mode)
{
    if(!SERVER)
        return ;
    if(!GrayConnect() && SERVER.CanSend < 2)
    {
        return ;
    }
    if(GrayConnect() && SERVER.ActualNodes.size > GetGrayServerConnections())
        return ;
    if(Arr.length)
    {
        var MinProcessCount = SERVER.BusyLevel - 1;
        for(var i = 0; i < Arr.length; i++)
        {
            var Node = Arr[i];
            if(Node.BlockProcessCount > MinProcessCount)
            {
                Arr.splice(i, 1);
                if(Mode === "CONNECT")
                {
                    Node.WasAddToConnect = undefined;
                    SERVER.StartConnectTry(Node);
                }
                else
                    if(Mode === "RECONNECT")
                    {
                        Node.WasAddToReconnect = undefined;
                        Node.CreateConnect();
                    }
                break;
            }
        }
    }
}
var idRunOnce;
function RunServer()
{
    idRunOnce = setInterval(RunOnce, 1000);
    ToLog("NETWORK: " + GetNetworkName());
    ToLog("VERSION: " + DEF_VERSION);
    if(global.NET_WORK_MODE)
    {
        global.START_IP = NET_WORK_MODE.ip;
        global.START_PORT_NUMBER = NET_WORK_MODE.port;
    }
    var KeyPair = crypto.createECDH('secp256k1');
    if(!global.SERVER_PRIVATE_KEY_HEX || global.NEW_SERVER_PRIVATE_KEY)
    {
        while(true)
        {
            var Arr = crypto.randomBytes(32);
            KeyPair.setPrivateKey(Buffer.from(Arr));
            var Arr2 = KeyPair.getPublicKey('', 'compressed');
            if(Arr2[0] === 2)
                break;
        }
        global.SERVER_PRIVATE_KEY_HEX = GetHexFromArr(Arr);
        SAVE_CONST(true);
    }
    var ServerPrivKey = GetArrFromHex(global.SERVER_PRIVATE_KEY_HEX);
    if(global.USE_NET_FOR_SERVER_ADDRES)
    {
        const os = require('os');
        var map = os.networkInterfaces();
        main:
        for(var key in map)
        {
            var arr = map[key];
            for(var i = 0; i < arr.length; i++)
            {
                var item = arr[i];
                if(!item.internal && item.mac !== "00:00:00:00:00:00")
                {
                    ServerPrivKey = sha3(global.SERVER_PRIVATE_KEY_HEX + ":" + item.mac + ":" + global.START_PORT_NUMBER);
                    break main;
                }
            }
        }
    }
    KeyPair.setPrivateKey(Buffer.from(ServerPrivKey));
    new CServer(KeyPair, START_IP, START_PORT_NUMBER, false, false);
    DoStartFindList();
}
function DoStartFindList()
{
    var keyThisServer = SERVER.ip + ":" + SERVER.port;
    for(var n = 0; n < FindList.length; n++)
    {
        var item = FindList[n];
        if(!item.ip)
            continue;
        var key = item.ip + ":" + item.port;
        if(keyThisServer === key)
            continue;
        var Node = SERVER.GetNewNode(item.ip, item.port);
        Node.StartFindList = 1;
    }
}
function RunOnce()
{
    if(global.SERVER && global.SERVER.CheckOnStartComplete)
    {
        clearInterval(idRunOnce);
        require("../core/update");
        RunOnUpdate();
        StartAllProcess(1);
        require("./dogs");
        if(global.RESTART_PERIOD_SEC)
        {
            var Period = (random(600) + global.RESTART_PERIOD_SEC);
            ToLog("SET RESTART NODE AFTER: " + Period + " sec");
            setInterval(function ()
            {
                RestartNode();
            }, Period * 1000);
        }
        setTimeout(function ()
        {
            RunStopPOWProcess();
        }, 10000);
    }
}
var glPortDebug = 49800;
function Fork(Path,ArrArgs)
{
    const child_process = require('child_process');
    ArrArgs = ArrArgs || [];
    if(global.LOCAL_RUN)
    {
        ArrArgs.push("LOCALRUN");
        ArrArgs.push("STARTNETWORK:" + global.START_NETWORK_DATE);
    }
    else
        if(global.TEST_NETWORK)
            ArrArgs.push("TESTRUN");
    ArrArgs.push("PATH:" + global.DATA_PATH);
    ArrArgs.push("HOSTING:" + global.HTTP_HOSTING_PORT);
    if(!global.USE_PARAM_JS)
        ArrArgs.push("NOPARAMJS");
    if(global.NWMODE)
        ArrArgs.push("NWMODE");
    if(global.NOALIVE)
        ArrArgs.push("NOALIVE");
    if(global.DEV_MODE)
        ArrArgs.push("DEV_MODE");
    glPortDebug++;
    var execArgv = [];
    var Worker = child_process.fork(Path, ArrArgs, {execArgv:execArgv});
    return Worker;
}
global.SpeedSignLib = 0;
global.TestSignLib = TestSignLib;
function TestSignLib(MaxTime)
{
    if(!MaxTime)
        MaxTime = DEF_PERIOD_SIGN_LIB;
    var hash = Buffer.from(GetArrFromHex("A6B0914953F515F4686B2BA921B8FAC66EE6A6D3E317B43E981EBBA52393BFC6"));
    var PubKey = Buffer.from(GetArrFromHex("026A04AB98D9E4774AD806E302DDDEB63BEA16B5CB5F223EE77478E861BB583EB3"));
    var Sign = Buffer.from(GetArrFromHex("5D5382C65E4C1E8D412D5F30F87B8F72F371E9E4FC170761BCE583A961CF44966F92B38D402BC1CBCB7567335051A321B93F4E32112129AED4AB602E093A1187"));
    var startTime = process.hrtime();
    var deltaTime = 1;
    for(var Num = 0; Num < 1000; Num++)
    {
        var Result = secp256k1.verify(hash, Sign, PubKey);
        if(!Result)
        {
            ToError("Error test sign");
            process.exit(0);
        }
        var Time = process.hrtime(startTime);
        deltaTime = Time[0] * 1000 + Time[1] / 1e6;
        if(deltaTime > MaxTime)
        {
            ToLog("*************** WARNING: VERY SLOW LIBRARY: secp256k1 ***************");
            ToLog("You can only process: " + Num + " transactions");
            ToLog("Install all dependent packages, see detail: https://www.npmjs.com/package/secp256k1");
            global.SpeedSignLib = Num;
            return 0;
        }
    }
    global.SpeedSignLib = Math.floor(Num * MaxTime / deltaTime);
    ToLog("TestSignLib: " + global.SpeedSignLib + " per sec");
    return 1;
}
