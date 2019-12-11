/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({InitClass:InitClass, Name:"Net"});
const NetFormat = {Method:"str", Call:"byte", RetContext:"uint", Data:"data"};
const NetFormatWrk = {};
var TEMP_ARR4 = [0, 0, 0, 0];
function InitClass(Engine)
{
    Engine.Traffic = 0;
    Engine.Send = function (Method,Child,DataObj,F)
    {
        if(Child.Del)
            return ;
        Engine.PrepareOnSend(Method, Child, DataObj, 1, F);
    };
    Engine.SendToNetwork = function (Child,Data)
    {
        if(Child.Del)
            return ;
        Engine.SENDTONETWORK(Child, Data);
        Engine.AddTrafic(Data.length);
        Engine.LogBufTransfer(Child, Data, "->");
    };
    Engine.ReceiveFromNetwork = function (Child,Data)
    {
        if(Engine.PrepareOnReceiveZip && global.glUseZip)
            Engine.PrepareOnReceiveZip(Child, Data);
        else
            Engine.PrepareOnReceive(Child, Data);
    };
    Engine.PrepareOnSend = function (Method,Child,DataObj,bCall,F,RetContext)
    {
        if(bCall)
        {
            RetContext = 0;
            if(F)
            {
                Child.IDContextNum++;
                RetContext = Child.IDContextNum;
                Child.ContextCallMap[RetContext] = F;
            }
        }
        var DataBuf = Engine.GetRAWFromObject(Child, Method, bCall, RetContext, DataObj);
        Engine.LogTransfer(Child, DataBuf, "->");
        WriteUint32AtPos(TEMP_ARR4, 4 + DataBuf.length, 0);
        var DataBuf2 = TEMP_ARR4.concat(DataBuf);
        if(Engine.PrepareOnSendZip && global.glUseZip)
            Engine.PrepareOnSendZip(Child, DataBuf2);
        else
            Engine.SendToNetwork(Child, DataBuf2);
    };
    Engine.PrepareOnReceive = function (Child,Chunk)
    {
        if(Child.Del)
            return ;
        for(var i = 0; i < Chunk.length; i++)
            Child.ReceiveDataArr.push(Chunk[i]);
        Engine.TweakOneMethod(Child);
    };
    Engine.TweakOneMethod = function (Child)
    {
        var Arr = Child.ReceiveDataArr;
        if(Arr.length < 5)
            return ;
        var Length = ReadUint32FromArr(Arr, 0);
        if(Length > JINN_CONST.MAX_PACKET_LENGTH)
        {
            Engine.ToError(Child, "Bad packet size");
            return ;
        }
        if(Arr.length === Length)
        {
            Engine.CallMethodOnReceive(Child, Arr.slice(4));
            Arr.length = 0;
        }
        else
            if(Length && Arr.length > Length)
            {
                Engine.CallMethodOnReceive(Child, Arr.slice(4, Length));
                Child.ReceiveDataArr = Arr.slice(Length);
                Engine.TweakOneMethod(Child);
            }
    };
    Engine.CallMethodOnReceive = function (Child,Chunk)
    {
        if(Child.Del)
            return ;
        Engine.LogTransfer(Child, Chunk, "<-");
        var Obj = Engine.GetObjectFromRAW(Chunk);
        if(Obj.Error)
        {
            Engine.ToError(Child, "Bad receive data");
            return ;
        }
        if(!Obj.Call)
        {
            var Key = Obj.RetContext;
            var F = Child.ContextCallMap[Key];
            if(!F)
            {
                Engine.ToError(Child, "Bad context key=" + Key);
                return ;
            }
            delete Child.ContextCallMap[Key];
            F(Child, Obj.Data);
        }
        else
        {
            var F = Engine[Obj.Method];
            if(typeof F !== "function")
            {
                Engine.ToError(Child, "Not fount method " + Obj.Method);
                return ;
            }
            var RetObj = F(Child, Obj.Data);
            if(RetObj !== undefined && Obj.RetContext)
            {
                Engine.PrepareOnSend(Obj.Method, Child, RetObj, 0, undefined, Obj.RetContext);
            }
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
        var Data = Engine.GetBufferFromData(Method, DataObj, bCall);
        var Obj = {Cache:Child.CurrentCache, Method:Method, Call:bCall, RetContext:RetContext, Data:Data};
        return SerializeLib.GetBufferFromObject(Obj, NetFormat, NetFormatWrk);
    };
    Engine.GetObjectFromRAW = function (BufData)
    {
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
            Engine.ToDebug(StrDirect + Child.ID + " " + (Obj.Call ? "" : "RET ") + Obj.Method + StrData);
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
}
