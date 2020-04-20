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
        Time = "";
        var ID = "" + Engine.ID;
        
        var Type = Str.substr(0, 2);
        if(Type === "<-" || Type === "->")
            ToLog("" + Time + ID + Str);
        else
            ToLog("" + Time + ID + "." + Str);
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
    const LOGNET_WIDTH = 200;
    const LOGNET_MAXSIZE = 80;
    
    Engine.GetLogNetBuf = function (Child)
    {
        if(!global.Buffer)
            return undefined;
        
        var Item;
        if(Child.AddrItem)
        {
            if(Child.LogNetBuf)
            {
                Child.AddrItem.LogNetBuf = Child.LogNetBuf;
                delete Child.LogNetBuf;
                return Child.AddrItem.LogNetBuf;
            }
            Item = Child.AddrItem;
        }
        else
        {
            Item = Child;
        }
        
        if(!Item.LogNetBuf)
        {
            Item.LogNetBuf = Buffer.alloc(LOGNET_MAXSIZE * LOGNET_WIDTH);
            Item.LogNetBuf.PosNum = 0;
        }
        
        return Item.LogNetBuf;
    };
    
    Engine.ToLogNet = function (Child,Str,nLogLevel)
    {
        var Buf = Engine.GetLogNetBuf(Child);
        if(!Buf)
            return;
        
        var length = Math.min(LOGNET_WIDTH, Str.length);
        
        var Num = (Buf.PosNum) % LOGNET_MAXSIZE;
        var Pos = Num * LOGNET_WIDTH;
        
        for(var i = Pos; i < Pos + length; i++)
            Buf[i] = 0;
        Buf.write(Str, Pos, length);
        
        Buf.PosNum++;
        
        if(nLogLevel)
            Engine.ToLog(Str, nLogLevel);
    };
    
    Engine.GetLogNetInfo = function (Child)
    {
        var Buf = Engine.GetLogNetBuf(Child);
        var Str = "";
        if(!Buf)
            return Str;
        
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
            
            var CurStr = Buf.toString('utf8', Pos, Pos + LOGNET_WIDTH);
            
            for(var i = CurStr.length - 1; i >= 0; i--)
            {
                if(CurStr.charCodeAt(i) !== 0)
                {
                    Str += CurStr.substr(0, i + 1) + "\n";
                    break;
                }
            }
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
