/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


'use strict';
/**
 *
 * The module is designed for exchanging network constants
 *
 **/

module.exports.Init = Init;

const FORMAT_NET_CONSTANT = {NetConstVer:"uint", NetConstStartNum:"uint", PROTOCOL_MODE:"uint", MAX_TRANSACTION_COUNT:"uint16",
    MIN_COUNT_FOR_CORRECT_TIME:"uint", CORRECT_TIME_TRIGGER:"uint16", CORRECT_TIME_VALUE:"uint16", INFLATION_TIME_VALUE:"byte",
    MAX_LEADER_COUNT:"byte", MAX_ITEMS_FOR_LOAD:"uint32", MAX_PACKET_SIZE:"uint32", MAX_PACKET_SIZE_RET_DATA:"uint32", MAX_BLOCK_SIZE:"uint32",
    MAX_ERR_PROCESS_COUNT:"uint", RECONNECT_MIN_TIME:"uint", MAX_LEVEL_CONNECTION:"byte", EXTRA_SLOTS_COUNT:"byte", RESERVE0001:"uint32",
    MAX_LEVEL_NODES:"byte", MAX_RET_NODE_LIST:"uint16", MAX_CACHE_BODY_LENGTH:"uint32", MAX_DEPTH_FOR_SECONDARY_CHAIN:"uint32",
    MAX_DELTA_PROCESSING:"byte", METHOD_ALIVE_TIME:"uint32", STEP_ADDTX:"byte", STEP_TICKET:"byte", STEP_TX:"byte", STEP_MINING:"byte",
    STEP_MAXHASH:"byte", STEP_LAST:"byte", STEP_CLEAR_MEM:"byte", CORRECT_TIME_RUN:"byte", CORRECT_TIME_START_NUM:"uint", CORRECT_TIME_END_NUM:"uint",
    CORRECT_TIME_ADD_MODE:"byte", CORRECT_TIME_DELTA:"uint", UNIQUE_IP_MODE:"uint16", CHECK_POINT_NUM:"uint", CHECK_POINT_HASH:"hash",
    RESERVE_DATA:"arr400", NET_SIGN:"arr64"};

var FormatForSign = CopyNetConstant({}, FORMAT_NET_CONSTANT, 1);

function Init(Engine)
{
    global.JINN_NET_CONSTANT = CopyNetConstant({}, JINN_CONST);
    JINN_NET_CONSTANT.NetConstVer = 0;
    JINN_NET_CONSTANT.NetConstStartNum = 0;
    
    Engine.NETCONSTANT_SEND = {NetConstVer:"uint"};
    Engine.NETCONSTANT_RET = FORMAT_NET_CONSTANT;
    
    Engine.StartGetNetConstant = function (Child,Version)
    {
        if(Version > GetCurrentBlockNumByTime() + 3000)
            return;
        
        var Delta = Date.now() - Child.LastGetNetConstant;
        if(Delta < 15000)
            return;
        
        Child.LastGetNetConstant = Date.now();
        
        Engine.Send("NETCONSTANT", Child, {NetConstVer:Version}, function (Child,Data)
        {
            if(!Data)
                return;
            
            Child.LastGetNetConstant = Date.now();
            
            if(Data.NetConstVer > JINN_NET_CONSTANT.NetConstVer)
            {
                if(!Engine.CheckNetConstant(Data))
                {
                    Engine.AddCheckErrCount(Child, 1, "Error check sign net const: " + Data.NetConstVer, 1);
                }
            }
        });
    };
    
    Engine.NETCONSTANT = function (Child,Data)
    {
        var RetData = CopyNetConstant({}, JINN_NET_CONSTANT);
        return RetData;
    };
    
    Engine.CheckNetConstant = function (Data)
    {
        if(!Data)
            return;
        
        var SignArr = Engine.GetSignCheckNetConstant(Data);
        if(!CheckDevelopSign(SignArr, Data.NET_SIGN))
        {
            return 0;
        }
        
        var CurBlockNum = GetCurrentBlockNumByTime();
        var Delta = Data.NetConstStartNum - CurBlockNum;
        if(Delta < 1)
            Delta = 1;
        
        ToLog("Got NEW NetConstant (wait " + Delta + " s) Ver: " + Data.NetConstVer);
        
        CopyNetConstant(JINN_NET_CONSTANT, Data);
        
        if(Engine.idTimerSetConst)
            clearTimeout(Engine.idTimerSetConst);
        Engine.idTimerSetConst = setTimeout(function ()
        {
            Engine.DoNetConst();
            Engine.idTimerSetConst = 0;
        }, Delta * 1000);
        
        return 1;
    };
    
    Engine.GetSignCheckNetConstant = function (Data)
    {
        var Buf = SerializeLib.GetBufferFromObject(Data, FormatForSign, {});
        return sha3(Buf, 12);
    };
    
    Engine.DoNetConst = function ()
    {
        ToLog("DoNetConstant: " + JINN_NET_CONSTANT.NetConstVer);
        
        CopyNetConstant(JINN_CONST, JINN_NET_CONSTANT);
        
        JINN_CONST.MAX_LEVEL_ALL = JINN_CONST.MAX_LEVEL_CONNECTION + JINN_CONST.EXTRA_SLOTS_COUNT;
    };
}

function CopyNetConstant(Dst,Src,bNotSign)
{
    for(var key in FORMAT_NET_CONSTANT)
    {
        if(bNotSign && key === "NET_SIGN")
            continue;
        Dst[key] = Src[key];
    }
    
    return Dst;
}
