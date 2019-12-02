/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({Init:Init, Name:"Serilize"});
function Init(Engine)
{
    Engine.SendFormatMap = {};
    Engine.GetBufferFromData = function (Method,Data,bSend)
    {
        var format = Engine.GetF(Method, bSend);
        if(format.struct === "")
            return undefined;
        var Buf = BufLib2.GetBufferFromObject(Data, format.struct, 0, format.wrk);
        return Buf;
    };
    Engine.GetDataFromBuffer = function (Method,Buf,bSend)
    {
        var format = Engine.GetF(Method, bSend);
        if(format.struct === "")
            return undefined;
        try
        {
            var Data = BufLib2.GetObjectFromBuffer(Buf, format.struct, format.wrk);
            return Data;
        }
        catch(e)
        {
            ToLog(e);
            return {};
        }
    };
    Engine.GetF = function (Method,bSend)
    {
        var name;
        if(bSend)
            name = Method + "_SEND";
        else
            name = Method + "_RET";
        var format = Engine.SendFormatMap[name];
        if(format === undefined)
        {
            var Str = Engine[name];
            if(Str !== undefined)
            {
                if(typeof Str === "object")
                    Str = BufLib2.GetFormatFromObject(Str);
                format = {struct:Str, wrk:{}};
            }
            else
            {
                throw "NOT FOUND FORMAT FOR METHOD: " + name;
            }
            Engine.SendFormatMap[name] = format;
        }
        return format;
    };
}
