/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Logs for debugging
 *
**/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Log"});

//Engine context

function InitClass(Engine)
{
    
    Engine.ToLog = function (Str,StartLevel)
    {
        if(StartLevel)
            return Engine.ToWarning(Str, StartLevel);
        
        var Time;
        var ID = "" + Engine.ID;
        
        var Type = Str.substr(0, 2);
        if(Type === "<-" || Type === "->")
            ToLog("" + ID + Str);
        else
            ToLog("" + ID + "." + Str);
    };
    
    Engine.ToLog1 = function (Str)
    {
        Engine.ToWarning(Str, 1);
    };
    Engine.ToLog2 = function (Str)
    {
        Engine.ToWarning(Str, 2);
    };
    Engine.ToLog3 = function (Str)
    {
        Engine.ToWarning(Str, 3);
    };
    Engine.ToLog4 = function (Str)
    {
        Engine.ToWarning(Str, 4);
    };
    Engine.ToLog5 = function (Str)
    {
        Engine.ToWarning(Str, 5);
    };
    
    Engine.ToWarning = function (Str,StartLevel)
    {
        if(global.JINN_WARNING >= StartLevel || Engine.ID === global.DEBUG_ID)
            Engine.ToLog(Str);
    };
    
    Engine.ToDebug = function (Str)
    {
        if(global.DEBUG_ID !== "ALL")
            if(Engine.ID !== global.DEBUG_ID)
                return;
        
        Engine.ToLog(Str);
    };
    
    Engine.ToError = function (Child,Str,WarningLevel)
    {
        Engine.AddCheckErrCount(Child, 1, Str, 1);
        
        if(WarningLevel === "t")
            ToLogTrace("" + Engine.ID + "<-->" + Child.ID + " ********ERROR: " + Str, WarningLevel);
        else
            if(global.JINN_WARNING >= WarningLevel || Engine.ID === global.DEBUG_ID)
            {
                var ID = GetNodeWarningID(Child);
                Engine.ToWarning("<-->" + ID + " ********ERROR: " + Str, WarningLevel);
            }
    };
    Engine.GetStrOnlyTime = function (now)
    {
        if(!now)
            now = Date.now();
        
        var Str = "" + now.getHours().toStringZ(2);
        Str = Str + ":" + now.getMinutes().toStringZ(2);
        Str = Str + ":" + now.getSeconds().toStringZ(2);
        Str = Str + "." + now.getMilliseconds().toStringZ(3);
        return Str;
    };
    const LOGNET_WIDTH = 200;
    const LOGNET_MAXSIZE = 80;
    
    function WriteLogToBuf(Buf,Time,Str)
    {
        var Num = (Buf.PosNum) % LOGNET_MAXSIZE;
        var Pos = Num * LOGNET_WIDTH;
        
        for(var i = Pos; i < Pos + LOGNET_WIDTH; i++)
            Buf[i] = 0;
        
        var length = Math.min(LOGNET_WIDTH - 6, Str.length);
        Buf.writeUIntLE(Time, Pos, 6);
        Buf.write(Str, Pos + 6, length);
        
        Buf.PosNum++;
    };
    function GetArrLogFromBuf(Buf)
    {
        var Arr = [];
        for(var n = 0; n < LOGNET_MAXSIZE; n++)
        {
            if(n >= Buf.PosNum)
                break;
            var Num;
            if(Buf.PosNum >= LOGNET_MAXSIZE)
                Num = (n + Buf.PosNum) % LOGNET_MAXSIZE;
            else
                Num = n;
            
            var Pos = Num * LOGNET_WIDTH;
            
            var Time = Buf.readUIntLE(Pos, 6);
            
            var CurStr = Buf.toString('utf8', Pos + 6, Pos + LOGNET_WIDTH);
            
            for(var i = CurStr.length - 1; i >= 0; i--)
            {
                if(CurStr.charCodeAt(i) !== 0)
                {
                    CurStr = CurStr.substr(0, i + 1);
                    break;
                }
            }
            
            Arr.push({Time:Time, Log:CurStr});
        }
        return Arr;
    };
    
    Engine.GetLogNetBuf = function (Child)
    {
        if(!global.Buffer)
            return undefined;
        
        var Item;
        if(Child.AddrItem)
        {
            Item = Child.AddrItem;
            if(!Item.LogNetBuf)
            {
                Item.LogNetBuf = Buffer.alloc(LOGNET_MAXSIZE * LOGNET_WIDTH);
                Item.LogNetBuf.PosNum = 0;
            }
            
            if(Child.LogNetBuf)
            {
                var Arr = GetArrLogFromBuf(Child.LogNetBuf);
                for(var n = 0; n < Arr.length; n++)
                {
                    var CurItemLog = Arr[n];
                    WriteLogToBuf(Item.LogNetBuf, CurItemLog.Time, CurItemLog.Log);
                }
                delete Child.LogNetBuf;
            }
            
            return Item.LogNetBuf;
        }
        else
        {
            if(!Child.LogNetBuf)
            {
                Child.LogNetBuf = Buffer.alloc(LOGNET_MAXSIZE * LOGNET_WIDTH);
                Child.LogNetBuf.PosNum = 0;
            }
            return Child.LogNetBuf;
        }
    };
    
    Engine.ToLogNet = function (Child,Str,nLogLevel)
    {
        var Buf = Engine.GetLogNetBuf(Child);
        if(!Buf)
            return;
        
        WriteLogToBuf(Buf, Date.now(), Str);
        
        if(nLogLevel)
        {
            var ID = GetNodeWarningID(Child);
            Engine.ToLog("<-->" + ID + " " + Str, nLogLevel);
        }
    };
    
    Engine.GetLogNetInfo = function (Child)
    {
        var Buf = Engine.GetLogNetBuf(Child);
        var Str = "";
        if(!Buf)
            return Str;
        
        var Arr = GetArrLogFromBuf(Buf);
        
        for(var n = 0; n < Arr.length; n++)
        {
            var Item = Arr[n];
            var StrTime = Engine.GetStrOnlyTime(new Date(Item.Time));
            Str += StrTime + " " + Item.Log + "\n";
        }
        return Str;
    };
}

if(!global.ToLogTrace)
    global.ToLogTrace = function (Str)
    {
        var Data = new Error().stack;
        var index = Data.indexOf("\n");
        index = Data.indexOf("\n", index + 1);
        Data = Data.substr(index);
        
        ToLog("" + Str + ":" + Data);
    };

global.GetNodeWarningID = function (Child)
{
    var ID = "" + Child.Level + ":" + Child.ID;
    return ID;
}
