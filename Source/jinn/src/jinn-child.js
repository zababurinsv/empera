/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({Init:Init, Name:"Child"});
function Init(Engine)
{
    Engine.NodeArray = [];
    Engine.NodeMap = {};
    Engine.GetChildByIPPort = function (ip,port,bInitAlways)
    {
        if(!port || typeof port !== "number")
            throw "GetChildByIPPort : Error port number = " + port;
        var HostName = String(ip) + ":" + port;
        var IDArr = sha3(HostName);
        var IDStr = GetHexFromArr(IDArr);
        return Engine.RetChild(IDStr, ip, port, bInitAlways);
    };
    Engine.RetChild = function (IDStr,ip,port,bInitAlways)
    {
        var Child = Engine.NodeMap[IDStr];
        if(!Child)
        {
            Child = Engine.NewChild(GetArrFromHex(IDStr), ip, port);
        }
        else
            if(bInitAlways)
            {
                Engine.InitChild(Child, ip, port);
            }
        if(IDStr === Engine.IDStr)
        {
            Child.Self = 1;
            Child.Active = 0;
        }
        return Child;
    };
    Engine.NewChild = function (IDArr,ip,port)
    {
        if(!port || typeof port !== "number")
            throw "NewChild : Error port number = " + port;
        var IDStr = GetHexFromArr(IDArr);
        var Child = Engine.NodeMap[IDStr];
        if(!Child)
        {
            Child = {IDStr:IDStr, IDArr:IDArr};
            Engine.NodeMap[Child.IDStr] = Child;
            Engine.NodeArray.push(Child);
        }
        Engine.InitChild(Child, ip, port);
        return Child;
    };
    Engine.InitChild = function (Child,ip,port)
    {
        Child.ip = ip;
        Child.port = port;
        Child.ChildNum = Engine.NodeArray.length;
        Child.LastTransferLider = 0;
        Child.ErrCount = 0;
        Child.IDContextNum = 0;
        Child.ContextCallMap = {};
        Child.SendAddrMap = {};
        Child.ReceiveDataArr = [];
        Child.ID = port % 1000;
        if(Engine.InitChildNext)
            Engine.InitChildNext(Child);
        Child.ToLog = function (Str)
        {
            ToLog("" + Engine.ID + "<--" + Child.ID + ":  " + Str);
        };
        Child.ToDebug = function (Str)
        {
            if(global.DEBUG_ID !== "ALL")
                if(Engine.ID !== global.DEBUG_ID)
                    return ;
            Child.ToLog(Str);
        };
    };
}
function InitNodeID(Node,ip,port)
{
    var HostName = String(ip) + ":" + port;
    var IDArr = sha3(HostName);
    Node.ip = ip;
    Node.port = port;
    Node.IDArr = IDArr;
    Node.IDStr = GetHexFromArr(IDArr);
    Node.ID = port % 1000;
}
global.InitNodeID = InitNodeID;
