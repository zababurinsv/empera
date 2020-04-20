/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


/**
 *
 * Handshake
 * Getting the main characteristics of the node with which the connection occurs
 *
**/


'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Handshake"});

//Engine context

function InitClass(Engine)
{
    Engine.RndHash = GetRandomBytes(32);
    Engine.RndHashStr = GetHexFromArr(Engine.RndHash);
    Engine.StartHandShake = function (Child)
    {
        
        var Data = {Protocol:JINN_CONST.PROTOCOL_NAME, Shard:JINN_CONST.SHARD_NAME, ip:Engine.ip, port:Engine.port, DirectIP:Engine.DirectIP,
            RndHash:Engine.RndHash, RunVersionNum:global.UPDATE_CODE_VERSION_NUM, CodeVersionNum:CODE_VERSION.VersionNum};
        Engine.Send("HANDSHAKE", Child, Data, Engine.OnHandShakeReturn);
    };
    
    Engine.HANDSHAKE_SEND = {Protocol:"str20", Shard:"str5", ServerIP:"str30", port:"uint16", DirectIP:"byte", RndHash:"hash",
        RunVersionNum:"uint", CodeVersionNum:"uint"};
    Engine.HANDSHAKE_RET = {result:"byte", RndHash:"hash", ClientIP:"str30", RunVersionNum:"uint", CodeVersionNum:"uint"};
    Engine.HANDSHAKE = function (Child,Data)
    {
        Child.ToLogNet("HANDSHAKE: " + JSON.stringify(Data));
        
        if(!Data)
            return;
        
        var Ret = {result:0, RndHash:Engine.RndHash, ClientIP:Child.ip, RunVersionNum:global.UPDATE_CODE_VERSION_NUM, CodeVersionNum:CODE_VERSION.VersionNum};
        var AddrChild = {ip:Child.ip, port:Data.port, BlockNum:0, Nonce:0, RndHash:Data.RndHash};
        
        var StrError;
        if(Data.Protocol !== JINN_CONST.PROTOCOL_NAME)
        {
            StrError = "ERROR PROTOCOL_NAME";
            Engine.OnDeleteConnect(Child, StrError);
        }
        else
            if(IsEqArr(Engine.RndHash, Data.RndHash))
            {
                if(Engine.ip === "0.0.0.0")
                    Engine.SetIP(AddrChild.ip);
                
                Engine.SetItemSelf(AddrChild);
                StrError = "ERROR: SELF ADDRESS";
            }
            else
                if(!Engine.CanConnect(Child))
                {
                    StrError = "ERROR: NOT CAN CONNECT";
                    Engine.OnDeleteConnect(Child, StrError);
                }
                else
                    if(Engine.FindConnectByHash(Data.RndHash))
                        StrError = "ERROR: FIND IN CONNECT";
        
        if(Engine.StartGetNewVersion && (Data.CodeVersionNum > CODE_VERSION.VersionNum || Data.CodeVersionNum === CODE_VERSION.VersionNum && IsZeroArr(CODE_VERSION.Hash)))
        {
            Engine.StartGetNewVersion(Child, Data.CodeVersionNum);
        }
        
        if(StrError)
        {
            Child.ToLogNet(StrError, 4);
            return Ret;
        }
        
        if(Data.DirectIP)
        {
            var FindItem = Engine.NodesTree.find(AddrChild);
            if(!FindItem)
            {
                FindItem = AddrChild;
                var Res = Engine.AddNodeAddr(AddrChild, Child);
                if(Res === 0)
                {
                    Engine.ToLog("Error HANDSHAKE #1");
                    return Ret;
                }
            }
            Child.AddrItem = FindItem;
        }
        else
        {
            Child.AddrItem = AddrChild;
        }
        if(!Child.AddrItem.Score || Child.AddrItem.Score <= 0)
            Child.AddrItem.Score = 0;
        
        Child.RndHash = Data.RndHash;
        Child.myip = Data.ServerIP;
        Engine.SetItemRndHash(Child.AddrItem, Data.RndHash);
        Engine.SetIPPort(Child, AddrChild.ip, AddrChild.port);
        Engine.LinkHotItem(Child);
        
        Engine.OnAddConnect(Child);
        
        Ret.result = 1;
        return Ret;
    };
    
    Engine.OnHandShakeReturn = function (Child,Data)
    {
        Child.RndHash = Data.RndHash;
        Child.myip = Data.ClientIP;
        Engine.SetItemRndHash(Child, Data.RndHash);
        
        if(!Data.result || !Engine.CanConnect(Child))
        {
            Child.ToLog("OnHandShakeReturn : Not can connect to " + Child.Name() + " result=" + Data.result, 4);
            
            Engine.OnDeleteConnect(Child, "OnHandShakeReturn");
            return;
        }
        
        Engine.OnAddConnect(Child);
        
        if(Engine.InHotStart(Child))
            Engine.TryHotConnection(Child, 1);
    };
}
