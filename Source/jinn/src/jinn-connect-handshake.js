/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

'use strict';
global.JINN_MODULES.push({InitClass:InitClass});
function InitClass(Engine)
{
    Engine.StartHandShake = function (Child)
    {
        var Data = {Protocol:JINN_CONST.PROTOCOL_NAME, Shard:JINN_CONST.SHARD_NAME, ip:Engine.ip, port:Engine.port, DirectIP:Engine.DirectIP,
        };
        Engine.Send("HANDSHAKE", Child, Data, Engine.OnHandShakeReturn);
    };
    Engine.HANDSHAKE_SEND = {Protocol:"str20", Shard:"str5", ip:"str30", port:"uint16", DirectIP:"byte"};
    Engine.HANDSHAKE_RET = {result:"byte"};
    Engine.HANDSHAKE = function (Child,Data)
    {
        if(Data.Protocol !== JINN_CONST.PROTOCOL_NAME || !Engine.CanConnect(Child) || (Engine.ip === Data.ip && Engine.port === Data.port))
        {
            Engine.OnDeleteConnect(Child);
            return {result:0};
        }
        var AddrItem;
        if(Data.DirectIP)
        {
            AddrItem = Engine.NodesTree.find(Data);
            if(!AddrItem)
            {
                AddrItem = {ip:Data.ip, port:Data.port, BlockNum:0, Nonce:0};
                var Res = Engine.AddNodeAddr(AddrItem);
                if(!Res)
                {
                    Engine.ToLog("Error HANDSHAKE #1");
                    return {result:0};
                }
            }
            Child.AddrItem = AddrItem;
        }
        else
        {
            Child.AddrItem = {ip:Data.ip, port:Data.port, BlockNum:0, Nonce:0};
        }
        Engine.SetIPPort(Child, Data.ip, Data.port);
        Engine.LinkHotItem(Child);
        Engine.AddConnect(Child);
        return {result:1};
    };
    Engine.OnHandShakeReturn = function (Child,Data)
    {
        if(!Data.result || !Engine.CanConnect(Child))
        {
            Engine.OnDeleteConnect(Child);
            return ;
        }
        Engine.AddConnect(Child);
        if(Engine.InHotStart(Child))
            Engine.TryHotConnection(Child, 1);
    };
}
