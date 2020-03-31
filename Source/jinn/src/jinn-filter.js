/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Responsible for the work safety policy
 * Contains algorithms for filtering unreliable nodes
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, Name:"Filter"});

global.MAXHASH_TIMING = 20;

//Engine context
var MapM = {};
MapM["GETNODES"] = {Period:1000};
MapM["HANDSHAKE"] = {Period:1000};
MapM["CONNECTLEVEL"] = {Period:1000};
MapM["DISCONNECTLEVEL"] = {Period:1000};
MapM["MAXHASH"] = {Period:MAXHASH_TIMING};
MapM["TRANSFERTT"] = {Period:50};
MapM["TRANSFERTX"] = {Period:100};

MapM["NETCONSTANT"] = {Period:10 * 1000};
MapM["VERSION"] = {Period:10 * 1000};
MapM["CODE"] = {Period:30 * 1000};

function InitClass(Engine)
{
    
    Engine.CanProcessPacket = function (Child,Data)
    {
        return 1;
    };
    
    Engine.CanProcessMethod = function (Child,Obj)
    {
        var Method = Obj.Method;
        var Item = MapM[Method];
        if(!Item)
        {
            Child.ToError("Error Method name: " + Method);
            return 0;
        }
        
        if(Engine.StopDoSendPacket(Child, Item, Method))
            return 0;
        
        return 1;
    };
    
    Engine.StopDoSendPacket = function (Child,Item,Method)
    {
        
        var CurTime = Date.now();
        
        var ArrTime = Child.TimeMap[Method];
        if(!ArrTime)
        {
            ArrTime = [0, 0, 0, 0, 0];
            Child.TimeMap[Method] = ArrTime;
        }
        
        ArrTime.sort(function (a,b)
        {
            return a - b;
        });
        
        var Delta = CurTime - ArrTime[0];
        if(Delta < Item.Period)
        {
            Engine.AddCheckErrCount(Child, 1, "Skip method: " + Method + " Delta=" + Delta + " ms");
            return 1;
        }
        
        ArrTime[0] = CurTime;
        return 0;
    };
}
