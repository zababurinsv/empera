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
        
        Child.ToLogNet("StartHandShake");
        
        var Data = {Protocol:JINN_CONST.PROTOCOL_NAME, Shard:JINN_CONST.SHARD_NAME, ip:Engine.ip, port:Engine.port, DirectIP:Engine.DirectIP,
            RndHash:Engine.RndHash, RunVersionNum:global.UPDATE_CODE_VERSION_NUM, CodeVersionNum:CODE_VERSION.VersionNum, RemoteIP:Child.ip,
            FindSelfIP:Child.FindSelfIP, };
        Engine.Send("HANDSHAKE", Child, Data, Engine.OnHandShakeReturn);
    };
    
    Engine.HANDSHAKE_SEND = {Protocol:"str20", Shard:"str5", RemoteIP:"str30", port:"uint16", DirectIP:"byte", RndHash:"hash",
        RunVersionNum:"uint", CodeVersionNum:"uint", FindSelfIP:"byte"};
    Engine.HANDSHAKE_RET = {result:"byte", RndHash:"hash", RemoteIP:"str30", RunVersionNum:"uint", CodeVersionNum:"uint"};
    Engine.HANDSHAKE = function (Child,Data)
    {
        var WasLevel = Child.Level;
        Child.ToLogNet("HANDSHAKE Level=" + WasLevel);
        
        if(!Data)
        {
            Child.ToLog("Error HANDSHAKE data", 2);
            return;
        }
        
        var Ret = {result:0, RndHash:Engine.RndHash, RemoteIP:Child.ip, RunVersionNum:global.UPDATE_CODE_VERSION_NUM, CodeVersionNum:CODE_VERSION.VersionNum};
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
                if(Engine.ip === "0.0.0.0" && !IsLocalIP(Data.RemoteIP))
                {
                    Child.ToLogNet("Set self IP: " + Data.RemoteIP, 4);
                    Engine.SetIP(Data.RemoteIP);
                }
                
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
        
        Engine.SetAddrItemForChild(AddrChild, Child, Data.DirectIP);
        
        Child.RndHash = Data.RndHash;
        
        Engine.DoMyAddres(Child, Data.RemoteIP);
        
        Engine.SetItemRndHash(Child.AddrItem, Data.RndHash);
        Engine.SetIPPort(Child, AddrChild.ip, AddrChild.port);
        
        if(WasLevel !== Child.Level)
            Child.ToLogNet("New Level=" + Child.Level);
        
        Engine.OnAddConnect(Child);
        
        Ret.result = 1;
        return Ret;
    };
    
    Engine.DoMyAddres = function (Child,myip)
    {
        if(myip && Engine.ip === "0.0.0.0" && !IsLocalIP(myip))
        {
            Child.myip = myip;
            var Child2 = Engine.NewConnect(Engine.IDArr, myip, Engine.port);
            if(Child2)
            {
                Child2.FindSelfIP = 1;
                var Str = "Start set  my ip = " + myip + ":" + Engine.port;
                Child.ToLog(Str, 4);
                Child2.ToLogNet(Str);
                Engine.SendConnectReq(Child2);
            }
        }
    };
    
    Engine.OnHandShakeReturn = function (Child,Data)
    {
        Child.RndHash = Data.RndHash;
        Engine.DoMyAddres(Child, Data.RemoteIP);
        Engine.SetItemRndHash(Child, Data.RndHash);
        
        if(!Data.result || !Engine.CanConnect(Child))
        {
            Child.ToLogNet("OnHandShakeReturn : Not can connect to " + Child.Name() + " result=" + Data.result, 4);
            
            Engine.OnDeleteConnect(Child, "OnHandShakeReturn");
            return;
        }
        
        Child.ToLogNet("Result HandShake OK");
        
        Engine.OnAddConnect(Child);
        
        if(Engine.InHotStart(Child))
            Engine.TryHotConnection(Child, 1);
    };
}
