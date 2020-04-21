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

global.MAX_BUSY_VALUE = 200;
global.MAX_SHA3_VALUE = 500;

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
        
        var AddrItem = Node.AddrItem;
        if(!AddrItem)
            AddrItem = {Score:Node.Score};
        var Item = {id:Node.ID, VersionNum:Node.CodeVersionNum, NetConstVer:Node.NetConstVer, ip:Node.ip, port:Node.port, Hot:IsHot,
            Level:Node.Level, addrStr:Node.IDStr, BlockProcessCount:AddrItem.Score, LastTimeTransfer:(Node.LastTransferTime ? Node.LastTransferTime : 0),
            DeltaTime:Node.DeltaTransfer, TransferCount:Node.TransferCount, LogInfo:Engine.GetLogNetInfo(Node), Active:IsOpen, ErrCountAll:Node.ErrCount,
            WasBan:Node.WasBan, INFO:Node.INFO_DATA, STATS:Node.STAT_DATA, };
        
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
            var Key = Node.ID;
            if(Map[Key])
                continue;
            AddNodeToArr(ArrRes, Node, Node.IsOpen(), Node.IsHot());
            Map[Key] = 1;
        }
        
        Arr = Engine.GetNodesArr();
        for(var i = 0; i < Arr.length; i++)
        {
            var AddrItem = Arr[i];
            var Key = AddrItem.ID;
            if(Map[Key])
                continue;
            
            AddNodeToArr(ArrRes, AddrItem, 0, 0);
            Map[Key] = 1;
        }
        
        return ArrRes;
    };
    
    SERVER.NetAddConnect = function (IDStr)
    {
        var Child = Engine.FindAddrItemByArr(GetArrFromHex(IDStr));
        if(!Child)
            return "CHILD NOT FOUND";
        
        var Child2 = Engine.RetNewConnectByAddr(Child);
        
        if(Child2)
            Child2.ToLogNet("=MANUAL CONNECT=");
        
        if(Child2 && Engine.SendConnectReq(Child2))
            return "OK AddConnect";
        else
            return "NO AddConnect";
    };
    
    SERVER.NetAddBan = function (IDStr)
    {
        var Child = Engine.FindConnectedChildByArr(GetArrFromHex(IDStr));
        if(!Child)
            return "CHILD NOT FOUND";
        
        Child.ToLogNet("=MANUAL BAN=");
        
        Engine.AddToBan(Child, "=BAN=");
        return "OK AddBan";
    };
    
    SERVER.NetAddHot = function (IDStr)
    {
        var Child = Engine.FindConnectedChildByArr(GetArrFromHex(IDStr));
        if(!Child)
            return "CHILD NOT FOUND";
        
        Child.ToLogNet("=MANUAL ADD HOT=");
        
        Engine.TryHotConnection(Child, 1);
        return "OK AddHot";
    };
    
    SERVER.NetDeleteNode = function (IDStr)
    {
        var Child = Engine.FindConnectedChildByArr(GetArrFromHex(IDStr));
        if(!Child)
            return "CHILD NOT FOUND";
        
        Child.ToLogNet("=MANUAL DELETE=");
        
        Engine.DenyHotConnection(Child, 1);
        return "OK DeleteNode";
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
        global.glMemoryUsage = (process.memoryUsage().heapTotal / 1024 / 1024) >>> 0;
        global.glFreeMem = os.freemem() / 1024 / 1024;
        ADD_TO_STAT("MAX:MEMORY_USAGE", glMemoryUsage);
        ADD_TO_STAT("MAX:MEMORY_FREE", glFreeMem);
        
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
        global.glMaxNumDB = MaxNumDB;
        
        JINN_STAT.TeraReadRowsDB += global.TeraReadRowsDB;
        JINN_STAT.TeraWriteRowsDB += global.TeraWriteRowsDB;
        
        global.TeraReadRowsDB = 0;
        global.TeraWriteRowsDB = 0;
        
        var Str = GetJinnStatInfo();
        Str = Str.replace(/[\n]/g, " ");
        var JinnStat = Engine;
        var StrMode = " H:" + (JinnStat.Header2 - JinnStat.Header1) + " B:" + (JinnStat.Block2 - JinnStat.Block1) + "";
        Str += StrMode;
        if(global.DEV_MODE === 12)
            ToLogInfo("" + MaxCurNumTime + ":" + Str);
        ADD_TO_STAT("MAX:TRANSACTION_COUNT", JINN_STAT.BlockTx);
        ADD_TO_STAT("MAX:SUM_POW", Engine.DB.MaxSumPow % 1000);
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
        
        global.TERA_STAT = {};
        CopyObjKeys(global.TERA_STAT, JINN_STAT);
        JINN_STAT.Clear();
    };
    
    Engine.CanUploadData = function (CurBlockNum,LoadBlockNum)
    {
        if(global.glKeccakCount < global.MAX_SHA3_VALUE && GetBusyTime() <= global.MAX_BUSY_VALUE)
        {
            return 1;
        }
        
        var Delta = Math.abs(CurBlockNum - LoadBlockNum);
        if(Delta < 8)
            return 1;
        
        return 0;
    };
}


global.GetBusyTime = GetBusyTime;
global.glBusySha3 = 0;
global.glBusyTime = 0;

var LastTimeIdle = 0;
function OnTimeIdleBusy()
{
    global.glBusyTime = (Date.now() - LastTimeIdle) * (100 / 50);
    
    LastTimeIdle = Date.now();
    global.glBusySha3 = global.glKeccakCount;
    global.glKeccakCount = 0;
    
    if(global.glStartStat)
    {
        if(global.glStartStat === 2)
        {
            ADD_TO_STAT("MAX:Busy", global.glBusyTime);
            ADD_TO_STAT("SHA3", global.glBusySha3);
        }
        global.glStartStat = 2;
    }
    
    setTimeout(OnTimeIdleBusy, 50);
}
OnTimeIdleBusy();

function GetBusyTime()
{
    var LocalBusyTime = (Date.now() - LastTimeIdle) * (100 / 50);
    return Math.max(LocalBusyTime, glBusyTime);
}
