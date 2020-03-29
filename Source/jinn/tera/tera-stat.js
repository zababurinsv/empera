/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';
module.exports.Init = Init;

const os = require('os');

global.MAX_BUSY_VALUE = 120;
global.MAX_SHA3_VALUE = 70000;

var GlSumUser;
var GlSumSys;
var GlSumIdle;

var PrevSumPow = 0;
function Init(Engine)
{
    
    SERVER.GetActualNodes = function ()
    {
        var Arr = [];
        
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Child = Engine.ConnectArray[i];
            if(!Child || !Child.IsOpen())
                continue;
            
            Arr.push(Child);
        }
        
        return Arr;
    };
    
    Engine.GetNodesArr = function ()
    {
        var Arr = [];
        var it = Engine.NodesTree.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            Arr.push(Item);
        }
        return Arr;
    };
    
    var GlobalNodeID = 0;
    var GlobalNodeMap = {};
    function GetLocalNodeID(IDStr)
    {
        var id = GlobalNodeMap[IDStr];
        if(!id)
        {
            GlobalNodeID++;
            GlobalNodeMap[IDStr] = GlobalNodeID;
            id = GlobalNodeID;
        }
        return id;
    };
    
    function AddNodeToArr(Arr,Node,IsOpen,IsHot)
    {
        if(!Node.IDStr)
        {
            Node.IDArr = CalcIDArr(Node.ip, Node.port);
            Node.IDStr = GetHexFromArr(Node.IDArr);
            Node.Level = Engine.AddrLevelArr(Engine.IDArr, Node.IDArr, 1);
        }
        if(IsEqArr(Engine.IDArr, Node.IDArr))
            return;
        
        var id = GetLocalNodeID(Node.IDStr);
        var Item = {id:id, VersionNum:Node.CodeVersionNum, NetConstVer:Node.NetConstVer, ip:Node.ip, port:Node.port, Hot:IsHot, Level:Node.Level,
            addrStr:Node.IDStr, BlockProcessCount:Node.BlockProcessCount, LastTimeTransfer:(Node.LastTransferTime ? Node.LastTransferTime : 0),
            DeltaTime:Node.DeltaTransfer, TransferCount:Node.TransferCount, Info:Node.Info ? Node.Info : "", Active:IsOpen, };
        
        var ArrLevel = Arr[Item.Level];
        if(!ArrLevel)
        {
            ArrLevel = [];
            Arr[Item.Level] = ArrLevel;
        }
        
        ArrLevel.push(Item);
    };
    
    SERVER.GetTransferTree = function ()
    {
        var Arr = SERVER.GetActualNodes();
        var ArrRes = [];
        var Map = {};
        for(var i = 0; i < Arr.length; i++)
        {
            var Node = Arr[i];
            Map[Node.ip + ":" + Node.port] = 1;
            AddNodeToArr(ArrRes, Node, Node.IsOpen(), Node.IsHot());
        }
        
        Arr = Engine.GetNodesArr();
        for(var i = 0; i < Arr.length; i++)
        {
            var Node = Arr[i];
            if(Map[Node.ip + ":" + Node.port])
                continue;
            
            AddNodeToArr(ArrRes, Node, 0, 0);
        }
        
        return ArrRes;
    };
    
    SERVER.OnStartSecond = function ()
    {
        var MaxCurNumTime = JINN_EXTERN.GetCurrentBlockNumByTime();
        SERVER.CurrentBlockNum = MaxCurNumTime;
        PrepareStatEverySecond();
        
        var Arr = SERVER.GetActualNodes();
        
        global.CountAllNode = Engine.GetCountAddr();
        global.CountConnectedNode = Arr.length;
        ADD_TO_STAT("MAX:HOT_NODES", global.CountConnectedNode);
        ADD_TO_STAT("MAX:CONNECTED_NODES", global.CountConnectedNode);
        ADD_TO_STAT("MAX:ALL_NODES", global.CountAllNode);
        
        ADD_TO_STAT("SENDDATA(KB)", Engine.SendTraffic / 1024);
        ADD_TO_STAT("GETDATA(KB)", Engine.ReceiveTraffic / 1024);
        Engine.SendTraffic = 0;
        Engine.ReceiveTraffic = 0;
        
        ADD_TO_STAT("MAX:TIME_DELTA", DELTA_CURRENT_TIME);
        
        ADD_TO_STAT("USEPACKET", Engine.ReceivePacket);
        Engine.ReceivePacket = 0;
        
        ADD_TO_STAT("NETCONFIGURATION", Engine.NetConfiguration);
        Engine.NetConfiguration = 0;
        
        ADD_TO_STAT("ERRORS", JINN_STAT.ErrorCount);
        ADD_TO_STAT("MAX:MEMORY_USAGE", process.memoryUsage().heapTotal / 1024 / 1024);
        ADD_TO_STAT("MAX:MEMORY_FREE", os.freemem() / 1024 / 1024);
        
        var SumUser = 0;
        var SumSys = 0;
        var SumIdle = 0;
        var cpus = os.cpus();
        for(var i = 0; i < cpus.length; i++)
        {
            var cpu = cpus[i];
            SumUser += cpu.times.user;
            SumSys += cpu.times.sys + cpu.times.irq;
            SumIdle += cpu.times.idle;
        }
        if(GlSumUser !== undefined)
        {
            var maxsum = cpus.length * 1000;
            ADD_TO_STAT("MAX:CPU_USER_MODE", Math.min(maxsum, SumUser - GlSumUser));
            ADD_TO_STAT("MAX:CPU_SYS_MODE", Math.min(maxsum, SumSys - GlSumSys));
            ADD_TO_STAT("MAX:CPU_IDLE_MODE", Math.min(maxsum, SumIdle - GlSumIdle));
            ADD_TO_STAT("MAX:CPU", Math.min(maxsum, SumUser + SumSys - GlSumUser - GlSumSys));
        }
        GlSumUser = SumUser;
        GlSumSys = SumSys;
        GlSumIdle = SumIdle;
        
        var MaxNumDB = SERVER.GetMaxNumBlockDB();
        var MaxBlock = Engine.GetBlockHeaderDB(MaxNumDB);
        if(MaxBlock)
        {
            if(PrevSumPow)
                ADD_TO_STAT("MAX:BLOCK_SUMPOW", MaxBlock.SumPow - PrevSumPow);
            PrevSumPow = MaxBlock.SumPow;
        }
        
        JINN_STAT.TeraReadRowsDB += global.TeraReadRowsDB;
        JINN_STAT.TeraWriteRowsDB += global.TeraWriteRowsDB;
        
        global.TeraReadRowsDB = 0;
        global.TeraWriteRowsDB = 0;
        
        var Str = GetJinnStatInfo();
        Str = Str.replace(/[\n]/g, " ");
        var JinnStat = Engine;
        var StrMode = " H:" + (JinnStat.Header2 - JinnStat.Header1) + " B:" + (JinnStat.Block2 - JinnStat.Block1) + "";
        Str += StrMode;
        if(global.DEV_MODE === 123)
            console.log("" + MaxCurNumTime + ":" + Str);
        ADD_TO_STAT("MAX:TRANSACTION_COUNT", JINN_STAT.BlockTx);
        for(var key in JINN_STAT.Methods)
        {
            var StatNum = Math.floor(JINN_STAT.Methods[key]);
            ADD_TO_STAT(key, StatNum);
        }
        for(var key in JINN_STAT.Keys)
        {
            var Name = JINN_STAT.Keys[key];
            if(Name)
            {
                if(Name.substr(0, 1) === "-")
                    Name = Name.substr(1);
                
                var StatNum = JINN_STAT[key];
                ADD_TO_STAT("JINN:" + Name, StatNum);
            }
        }
        
        ADD_TO_STAT("SHA3", global.glKeccakCount);
        
        ADD_TO_STAT("MAX:Busy", GetBusy());
        
        global.glKeccakCount = 0;
        
        global.TERA_STAT = {};
        CopyObjKeys(global.TERA_STAT, JINN_STAT);
        JINN_STAT.Clear();
    };
    
    Engine.CanUploadData = function (CurBlockNum,LoadBlockNum)
    {
        if(global.glKeccakCount < global.MAX_SHA3_VALUE && GetBusy() <= global.MAX_BUSY_VALUE)
        {
            return 1;
        }
        
        var Delta = Math.abs(CurBlockNum - LoadBlockNum);
        if(Delta < 8)
            return 1;
        
        return 0;
    };
}

const RUN_TIME_PERIOD = 50;
global.ArrIdle = [];
function OnTimeIdleBusy()
{
    if(ArrIdle.length >= 6)
        ArrIdle.length = 6;
    ArrIdle.unshift(Date.now());
}
setInterval(OnTimeIdleBusy, RUN_TIME_PERIOD);

function GetBusy()
{
    var Time = Date.now();
    var Count = 0;
    var SumTime = 0;
    for(var i = 0; i < ArrIdle.length; i++)
    {
        var Delta = Time - ArrIdle[i];
        if(i === 0 && Delta < RUN_TIME_PERIOD)
        {
        }
        else
        {
            SumTime += Time - ArrIdle[i];
            Count++;
        }
        Time = ArrIdle[i];
        if(Count >= 5)
            break;
    }
    
    return SumTime / 2.5;
}
