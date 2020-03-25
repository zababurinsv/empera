/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Asynchronous startup of the processing unit according to the timings
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode, Name:"Timing"});

//Engine context
function InitClass(Engine)
{
    Engine.MaxLinkedBlockDB = 0;
    Engine.MaxLinkedBlockDB2 = 0;
    
    Engine.WasCorrectTime = 0;
    Engine.MapStatArray = {};
    Engine.MapStatWasBlockNum = {};
    Engine.MaxTimeStatus = {BlockNum:0, Power:0, Hash:MAX_ARR_32};
    Engine.UseTimeCorrect = function (NewDelta,Count)
    {
        if(Count >= JINN_CONST.MIN_COUNT_FOR_CORRECT_TIME)
        {
            if(Engine.WasCorrectTime)
            {
                if(Math.abs(NewDelta) >= JINN_CONST.CORRECT_TIME_TRIGGER)
                {
                    ToLog("NewDelta: " + NewDelta);
                    if(NewDelta < 0)
                        NewDelta =  - JINN_CONST.CORRECT_TIME_VALUE;
                    else
                        NewDelta = JINN_CONST.CORRECT_TIME_VALUE;
                }
                else
                {
                    NewDelta = 0;
                }
            }
            if(NewDelta)
            {
                ToLog("SET TIME DELTA: " + NewDelta + " ms");
                Engine.SetTimeDelta(global.DELTA_CURRENT_TIME + NewDelta);
            }
            Engine.MapStatArray = {};
            Engine.WasCorrectTime = 1;
        }
    };
    
    Engine.SetTimeDelta = function (DeltaTime)
    {
        global.DELTA_CURRENT_TIME = DeltaTime;
    };
    
    Engine.DoTimeCorrect = function (CurBlockNum)
    {
        if(!global.JINN_AUTO_CORRECT_TIME)
            return ;
        
        var MaxItem = Engine.MaxTimeStatus;
        if(!MaxItem.BlockNum)
            return ;
        
        var Delta = CurBlockNum - MaxItem.BlockNum - JINN_CONST.STEP_MAXHASH;
        var Value = Engine.MapStatArray[Delta];
        if(!Value)
            Value = 0;
        Value++;
        Engine.MapStatArray[Delta] = Value;
        
        Engine.MaxTimeStatus = {BlockNum:0, Power:0, Hash:MAX_ARR_32};
        Engine.MapStatWasBlockNum[MaxItem.BlockNum] = 1;
        var MaxValue = 0;
        var MaxKey = "0";
        for(var key in Engine.MapStatArray)
        {
            var Value = Engine.MapStatArray[key];
            if(Value > MaxValue)
            {
                MaxValue = Value;
                MaxKey = key;
            }
        }
        
        var MaxK =  + MaxKey;
        var MaxValue1 = Engine.MapStatArray[MaxK - 1];
        if(!MaxValue1)
            MaxValue1 = 0;
        var MaxValue2 = Engine.MapStatArray[MaxK + 1];
        if(!MaxValue2)
            MaxValue2 = 0;
        var SMW = MaxValue1 * (MaxK - 1) + MaxValue * (MaxK) + MaxValue2 * (MaxK + 1);
        var SM = MaxValue1 + MaxValue + MaxValue2;
        if(!SM)
            return ;
        var AvgKey = Math.floor(1000 * SMW / SM);
        
        Engine.UseTimeCorrect( - AvgKey, SM);
    };
    
    Engine.AddMaxHashToTimeStat = function (Child,Data)
    {
        if(!global.JINN_AUTO_CORRECT_TIME)
            return ;
        
        var BlockNum = Data.BlockNum;
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        var Delta = CurBlockNum - BlockNum;
        if(Engine.WasCorrectTime && Math.abs(Delta) > 2000)
            return ;
        
        if(Engine.MapStatWasBlockNum[BlockNum])
            return ;
        if(!Data.Arr.length)
            return ;
        
        var Item = Data.Arr[0];
        Engine.CalcHashMaxLider(Item, BlockNum);
        
        var MaxItem = Engine.MaxTimeStatus;
        if(Engine.CompareMaxLider(MaxItem, Item) < 0)
        {
            if(MaxItem.BlockNum !== BlockNum)
                MaxItem.StartTime = Date.now();
            MaxItem.BlockNum = BlockNum;
            MaxItem.Power = Item.Power;
            MaxItem.Hash = Item.Hash;
        }
    };
}

function DoNode(Engine)
{
    if(Engine.Del)
        return ;
    if(Engine.ROOT_NODE)
        return ;
    
    var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
    Engine.MaxLinkedBlockDB2 = CurBlockNum - JINN_CONST.STEP_MINING - JINN_CONST.LINK_HASH_DELTA;
    Engine.MaxLinkedBlockDB = CurBlockNum + 100;
    
    if(Engine.LastCurBlockNum !== CurBlockNum)
    {
        Engine.DoTimeCorrect(CurBlockNum);
        
        Engine.LastCurBlockNum = CurBlockNum;
        
        if(Engine.SendTicket && global.glUseTicket)
        {
            Engine.InitTicket(CurBlockNum - JINN_CONST.STEP_TICKET);
        }
        
        Engine.DoBlockMining(CurBlockNum - JINN_CONST.STEP_MINING);
    }
    Engine.SendTicket(CurBlockNum - JINN_CONST.STEP_TICKET);
    Engine.SendTx(CurBlockNum - JINN_CONST.STEP_TX);
    Engine.StartSendLiderArr(CurBlockNum - JINN_CONST.STEP_MAXHASH);
}
