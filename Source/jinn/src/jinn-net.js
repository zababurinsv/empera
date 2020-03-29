/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Organization of data transmission/reception to the network
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Net"});

global.TEST_NET_DEBUG = 1;
const NET_STRING_MODE = 0;

var TEMP_PACKET_ARR = [0, 0, 0, 0];
if(global.TEST_NET_DEBUG)
    TEMP_PACKET_ARR = [0, 0, 0, 0, 0, 0, 0, 0];

//Engine context

const NetFormat = {Method:"str", Call:"byte", RetContext:"uint", Data:"data"};
const NetFormatWrk = {};

function InitClass(Engine)
{
    Engine.Traffic = 0;
    Engine.SendTraffic = 0;
    Engine.ReceiveTraffic = 0;
    Engine.ReceivePacket = 0;
    Engine.Send = function (Method,Child,DataObj,F)
    {
        
        Engine.PrepareOnSend(Method, Child, DataObj, 1, F);
    };
    Engine.SendToNetwork = function (Child,Data)
    {
        Engine.SENDTONETWORK(Child, Data);
        Engine.AddTrafic(Data.length);
        Engine.SendTraffic += Data.length;
        Engine.LogBufTransfer(Child, Data, "->");
    };
    Engine.ReceiveFromNetwork = function (Child,Data)
    {
        if(typeof process !== "object")
            return Engine.ReceiveFromNetworkNext(Child, Data);
        
        var startTime = process.hrtime();
        
        Engine.ReceiveFromNetworkNext(Child, Data);
        
        Engine.AddMethodStatTime("ReceiveFromNetwork", startTime, 1);
    };
    Engine.PrepareOnSend = function (Method,Child,DataObj,bCall,F,RetContext)
    {
        if(typeof process !== "object")
            return Engine.PrepareOnSendNext(Method, Child, DataObj, bCall, F, RetContext);
        
        var startTime = process.hrtime();
        
        Engine.PrepareOnSendNext(Method, Child, DataObj, bCall, F, RetContext);
        
        Engine.AddMethodStatTime("SendToNetwork", startTime, 1);
    };
    
    Engine.ReceiveFromNetworkNext = function (Child,Data)
    {
        Engine.ReceiveTraffic += Data.length;
        
        if(!Engine.CanProcessPacket(Child, Data))
            return;
        
        if(Engine.PrepareOnReceiveZip && global.glUseZip && Child.UseZip)
            Engine.PrepareOnReceiveZip(Child, Data);
        else
            Engine.PrepareOnReceive(Child, Data);
    };
    
    Engine.PrepareOnSendNext = function (Method,Child,DataObj,bCall,F,RetContext)
    {
        var State = Engine.GetSocketStatus(Child);
        if(State !== 100)
        {
            var StrData = JSON.stringify(DataObj);
            Child.ToLog(Method + " - ERROR SEND - NOT WAS CONNECT: State=" + State + " IsHot:" + Child.IsHot() + " IsOpen=" + Child.IsOpen(),
            4);
            return;
        }
        
        if(bCall)
        {
            RetContext = 0;
            if(F)
            {
                Child.IDContextNum++;
                RetContext = Child.IDContextNum;
                Child.ContextCallMap[RetContext] = {Method:Method, F:F};
            }
        }
        
        var DataBuf = Engine.GetRAWFromObject(Child, Method, bCall, RetContext, DataObj);
        Engine.LogTransfer(Child, DataBuf, "->");
        
        if(global.TEST_NET_DEBUG)
        {
            WriteUint32AtPos(TEMP_PACKET_ARR, Child.SendPacketCount, 0);
            WriteUint32AtPos(TEMP_PACKET_ARR, 8 + DataBuf.length, 4);
        }
        else
        {
            WriteUint32AtPos(TEMP_PACKET_ARR, 4 + DataBuf.length, 0);
        }
        
        var DataBuf2 = TEMP_PACKET_ARR.concat(DataBuf);
        
        if(Engine.PrepareOnSendZip && global.glUseZip && Child.UseZip)
            Engine.PrepareOnSendZip(Child, DataBuf2);
        else
            Engine.SendToNetwork(Child, DataBuf2);
        
        Child.SendPacketCount++;
    };
    Engine.PrepareOnReceive = function (Child,Chunk)
    {
        for(var i = 0; i < Chunk.length; i++)
            Child.ReceiveDataArr.push(Chunk[i]);
        
        Engine.TweakOneMethod(Child);
    };
    Engine.TweakOneMethod = function (Child)
    {
        
        var Arr = Child.ReceiveDataArr;
        if(Arr.length < 5)
            return;
        
        var Length;
        var Pos;
        if(global.TEST_NET_DEBUG)
        {
            if(Arr.length < 8)
            {
                return;
            }
            
            var PacketNum = ReadUint32FromArr(Arr, 0);
            Length = ReadUint32FromArr(Arr, 4);
            if(PacketNum !== Child.ReceivePacketCount)
            {
                Engine.ToError(Child, "Bad packet num = " + PacketNum + "/" + Child.ReceivePacketCount, 0);
                Child.ReceivePacketCount = PacketNum;
            }
            
            Pos = 8;
            
            Child.ReceivePacketCount++;
        }
        else
        {
            Length = ReadUint32FromArr(Arr, 0);
            Pos = 4;
        }
        
        if(Length > JINN_CONST.MAX_PACKET_SIZE)
        {
            Engine.ToError(Child, "Bad packet size = " + Length, 0);
            return;
        }
        
        if(Arr.length === Length)
        {
            
            Engine.CallMethodOnReceive(Child, Arr.slice(Pos));
            Arr.length = 0;
        }
        else
            if(Length && Arr.length > Length)
            {
                Engine.CallMethodOnReceive(Child, Arr.slice(Pos, Length));
                
                Child.ReceiveDataArr = Arr.slice(Length);
                Engine.TweakOneMethod(Child);
            }
            else
                if(global.TEST_NET_DEBUG)
                {
                    Child.ReceivePacketCount--;
                }
    };
    
    Engine.CallMethodOnReceive = function (Child,Chunk)
    {
        Engine.ReceivePacket++;
        
        Engine.LogTransfer(Child, Chunk, "<-");
        
        var Obj = Engine.GetObjectFromRAW(Chunk);
        if(Obj.Error)
        {
            Engine.ToError(Child, "Bad receive data", 0);
            return;
        }
        
        if(!Obj.Call)
        {
            var Key = Obj.RetContext;
            var Cont = Child.ContextCallMap[Key];
            if(!Cont || Cont.Method !== Obj.Method)
            {
                Engine.ToError(Child, "Bad context " + Obj.Method + " key=" + Key, 0);
                return;
            }
            
            delete Child.ContextCallMap[Key];
            Engine.RunMethod(Obj.Method + "_RET", Cont.F, Child, Obj.Data, 0);
        }
        else
        {
            if(!Engine.CanProcessMethod(Child, Obj))
                return;
            
            var F = Engine[Obj.Method];
            if(typeof F !== "function")
            {
                Engine.ToError(Child, "Not fount method " + Obj.Method, 0);
                return;
            }
            var RetObj = Engine.RunMethod(Obj.Method, F, Child, Obj.Data, 1);
            if(RetObj !== undefined && Obj.RetContext)
            {
                Engine.PrepareOnSend(Obj.Method, Child, RetObj, 0, undefined, Obj.RetContext);
            }
        }
    };
    
    Engine.RunMethod = function (Method,F,Child,Data,bCall)
    {
        if(typeof process === "object")
        {
            var startTime = process.hrtime();
            
            var Ret = F(Child, Data);
            
            var Time = process.hrtime(startTime);
            var deltaTime = Time[0] * 1000 + Time[1] / 1e6;
            
            Engine.AddMethodStatTime(Method, deltaTime);
            
            if(bCall)
                JINN_STAT.TimeCall += deltaTime;
            else
                JINN_STAT.TimeRet += deltaTime;
            
            return Ret;
        }
        else
        {
            return F(Child, Data);
        }
    };
    
    Engine.GetRAWFromJSON = function (Str)
    {
        var Arr = [];
        for(var i = 0; i < Str.length; i++)
            Arr.push(Str.charCodeAt(i));
        return Arr;
    };
    
    Engine.GetJSONFromRAW = function (Arr)
    {
        var Str = "";
        for(var i = 0; i < Arr.length; i++)
            Str += String.fromCharCode(Arr[i]);
        return Str;
    };
    
    Engine.GetRAWFromObject = function (Child,Method,bCall,RetContext,DataObj)
    {
        if(NET_STRING_MODE)
        {
            var Obj = {Cache:Child.CurrentCacheVersion, Method:Method, Call:bCall, RetContext:RetContext, Data:DataObj};
            return Engine.GetRAWFromJSON(JSON.stringify(Obj));
        }
        
        var Data = Engine.GetBufferFromData(Method, DataObj, bCall);
        var Obj = {Cache:Child.CurrentCacheVersion, Method:Method, Call:bCall, RetContext:RetContext, Data:Data};
        return SerializeLib.GetBufferFromObject(Obj, NetFormat, NetFormatWrk);
    };
    
    Engine.GetObjectFromRAW = function (BufData)
    {
        if(NET_STRING_MODE)
        {
            var Str = Engine.GetJSONFromRAW(BufData);
            return JSON.parse(Str);
        }
        
        var Obj = SerializeLib.GetObjectFromBuffer(BufData, NetFormat, NetFormatWrk);
        if(Obj.Data && !Obj.Data.length)
            Obj.Data = undefined;
        
        Obj.Data = Engine.GetDataFromBuffer(Obj.Method, Obj.Data, Obj.Call);
        return Obj;
    };
    
    Engine.LogBufTransfer = function (Child,Data,StrDirect)
    {
        if(0 && global.DEBUG_ID && Data)
        {
            Engine.ToDebug(StrDirect + Child.ID + " " + GetHexFromArr(Data) + " - " + Data.length + "/" + Engine.Traffic);
        }
    };
    
    Engine.LogTransfer = function (Child,Data,StrDirect)
    {
        
        if(global.DEBUG_ID && Data)
        {
            
            var Obj = Engine.GetObjectFromRAW(Data);
            var StrData = " DATA:" + JSON.stringify(Obj);
            var ID = GetNodeID(Child);
            
            Engine.ToDebug(StrDirect + ID + " " + (Obj.Call ? "" : "RET ") + Obj.Method + StrData);
        }
    };
    
    Engine.PrevTraficBlockNum = 0;
    Engine.AddTrafic = function (Count)
    {
        Engine.Traffic += Count;
        
        JINN_STAT.AllTraffic += Count;
        
        var BlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        if(BlockNum !== Engine.PrevTraficBlockNum)
        {
            Engine.PrevTraficBlockNum = BlockNum;
            Engine.Traffic = 0;
        }
    };
    
    Engine.AddCheckErrCount = function (Child,Count,StrErr,bSilent)
    {
        JINN_STAT.ErrorCount += Count;
        Child.ErrCount += Count;
        
        if(Child.ErrCount > 10)
        {
            Child.ErrCount = 0;
            Child.BlockProcessCount--;
        }
        
        if(!bSilent)
            Child.ToLog(StrErr, 4);
    };
}
