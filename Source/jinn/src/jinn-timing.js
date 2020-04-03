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

const OLD_STAT_BLOCKNUM_PERIOD = 3600;

//Engine context
function InitClass(Engine)
{
    Engine.MaxLinkedBlockDB = 0;
    Engine.MaxLinkedBlockDB2 = 0;
    
    Engine.WasCorrectTime = 0;
    Engine.StatArray = [];
    Engine.MapStatWasBlockNum = {};
    
    Engine.TreeTimeStat = new RBTree(function (a,b)
    {
        return CompareArr(a.Hash, b.Hash);
    });
    
    Engine.MaxTimeStatus = {Power:0, Hash:MAX_ARR_32, PowHash:MAX_ARR_32};
    Engine.SetTimeDelta = function (DeltaTime)
    {
        global.DELTA_CURRENT_TIME = DeltaTime;
    };
    Engine.CorrectTimeByDelta = function (NewDelta)
    {
        
        if(Engine.WasCorrectTime > 0)
        {
            var NewDeltaAbs = Math.abs(NewDelta);
            if(NewDeltaAbs >= JINN_CONST.CORRECT_TIME_TRIGGER)
            {
                if(NewDeltaAbs > JINN_CONST.CORRECT_TIME_VALUE)
                {
                    if(NewDelta < 0)
                        NewDelta =  - JINN_CONST.CORRECT_TIME_VALUE;
                    else
                        NewDelta = JINN_CONST.CORRECT_TIME_VALUE;
                }
            }
            else
            {
                NewDelta = 0;
            }
            
            var TestValue = Math.floor(global.DELTA_CURRENT_TIME + NewDelta);
            if(Math.abs(TestValue) > Math.abs(global.DELTA_CURRENT_TIME))
            {
                NewDelta = Math.floor(NewDelta / 2);
            }
        }
        if(global.DELTA_CURRENT_TIME > 0)
            NewDelta -= JINN_CONST.INFLATION_TIME_VALUE;
        else
            if(global.DELTA_CURRENT_TIME < 0)
                NewDelta += JINN_CONST.INFLATION_TIME_VALUE;
        
        if(NewDelta)
        {
            var Value = Math.floor(global.DELTA_CURRENT_TIME + NewDelta);
            ToLog("SET TIME DELTA: " + Value + " ms (" + NewDelta + ")", 4);
            Engine.SetTimeDelta(Value);
        }
        Engine.StatArray = [];
        Engine.WasCorrectTime++;
    };
    
    Engine.CorrectTimeByArr = function (Arr)
    {
        if(Arr.length < JINN_CONST.MIN_COUNT_FOR_CORRECT_TIME)
            return;
        var Sum = 0;
        for(var i = 0; i < Arr.length; i++)
            Sum += Arr[i];
        var AvgSum1 = Sum / Arr.length;
        Sum = 0;
        var Count = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Delta = AvgSum1 - Arr[i];
            Sum += Delta * Delta;
        }
        var AvgDisp = Sum / Arr.length;
        
        Sum = 0;
        var Count = 0;
        for(var i = 0; i < Arr.length; i++)
        {
            var Delta = AvgSum1 - Arr[i];
            if(Delta * Delta < AvgDisp)
            {
                Sum += Arr[i];
                Count++;
            }
        }
        
        if(Count < JINN_CONST.MIN_COUNT_FOR_CORRECT_TIME / 2)
            return;
        var AvgSum2 = Sum / Count;
        Engine.CorrectTimeByDelta( - Math.floor(1000 * AvgSum2));
    };
    
    Engine.DoTimeCorrect = function (bReglament)
    {
        if(!global.JINN_AUTO_CORRECT_TIME)
            return;
        
        if(bReglament)
            Engine.ClearOldStatTree();
        
        var MaxItem = Engine.MaxTimeStatus;
        if(!MaxItem.BlockNum)
            return;
        if(Engine.TreeTimeStat.find({Hash:MaxItem.Hash}))
            return;
        
        var DeltaStart = Date.now() - MaxItem.StartTime;
        if(DeltaStart < 1000)
            return;
        Engine.TreeTimeStat.insert({Hash:MaxItem.Hash, BlockNum:MaxItem.BlockNum});
        
        JINN_STAT.DeltaTime = MaxItem.Delta;
        var Delta = MaxItem.Delta - JINN_CONST.STEP_MAXHASH;
        
        Engine.StatArray.push(Delta);
        Engine.MaxTimeStatus = {Power:0, Hash:MAX_ARR_32, PowHash:MAX_ARR_32};
        
        Engine.CorrectTimeByArr(Engine.StatArray);
    };
    
    Engine.AddMaxHashToTimeStat = function (Item,BlockNum)
    {
        if(!global.JINN_AUTO_CORRECT_TIME)
            return;
        if(!global.FIRST_TIME_BLOCK)
            return;
        
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        var Delta = CurBlockNum - BlockNum;
        if(Engine.WasCorrectTime && Math.abs(Delta) > OLD_STAT_BLOCKNUM_PERIOD)
            return;
        
        Engine.CalcHashMaxLider(Item, BlockNum);
        
        var MaxItem = Engine.MaxTimeStatus;
        if(!IsEqArr(Item.Hash, MaxItem.Hash) && Engine.CompareMaxLider(Item, MaxItem) > 0)
        {
            if(Engine.TreeTimeStat.find({Hash:Item.Hash}))
                return;
            
            MaxItem.Delta = (Date.now() - BlockNum * 1000 - global.FIRST_TIME_BLOCK + global.DELTA_CURRENT_TIME + 1000) / 1000;
            
            MaxItem.StartTime = Date.now();
            MaxItem.BlockNum = BlockNum;
            MaxItem.Power = Item.Power;
            MaxItem.MinerHash = Item.MinerHash;
            MaxItem.Hash = Item.Hash;
            MaxItem.PowHash = Item.PowHash;
            MaxItem.CurBlockNum = CurBlockNum;
        }
        
        Engine.DoTimeCorrect();
    };
    
    Engine.ClearOldStatTree = function ()
    {
        if(!Engine.WasCorrectTime)
            return;
        
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        var OldBlockNum = CurBlockNum - OLD_STAT_BLOCKNUM_PERIOD;
        var it = Engine.TreeTimeStat.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            if(Item.BlockNum < OldBlockNum)
            {
                Engine.TreeTimeStat.remove(Item);
            }
        }
    };
    Engine.StartStatBlockNum = 0;
    Engine.StartStatTime = 0;
    Engine.MapStatArray = {};
    Engine.AddMaxHashToTreeTimeStat = function (Data)
    {
        if(!Data.Arr.length)
            return;
        
        if(Data.BlockNum <= Engine.StartStatBlockNum)
            return;
        
        var NewItem = Data.Arr[0];
        Engine.CalcHashMaxLider(NewItem, Data.BlockNum);
        
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        
        if(!Engine.TreeTimeStat.find(NewItem))
        {
            NewItem.Delta = CurBlockNum - NewItem.BlockNum;
            Engine.TreeTimeStat.insert(NewItem);
            if(Engine.TreeTimeStat.size > global.BlockStatCount * 20)
            {
                Engine.TreeTimeStat.remove(Engine.TreeTimeStat.max());
            }
        }
        if(!Engine.StartStatTime)
            Engine.StartStatTime = Date.now();
        var Delta = Date.now() - Engine.StartStatTime;
        if(Delta < global.BlockStatCountTime * 1000)
            return;
        var Arr = [];
        var Map = {};
        
        var it = Engine.TreeTimeStat.iterator(), Item;
        while((Item = it.next()) !== null)
        {
            if(Map[Item.BlockNum])
                continue;
            Map[Item.BlockNum] = 1;
            Arr.push(Item);
            
            if(Arr.length >= global.BlockStatCount)
                break;
        }
        
        Engine.StartStatTime = Date.now();
        if(Arr.length <= global.BlockStatCount / 2)
        {
            return;
        }
        
        Arr.sort(function (a,b)
        {
            return a.BlockNum - b.BlockNum;
        });
        
        Engine.MapStatArray = [];
        
        for(var i = 0; i < Arr.length; i++)
        {
            var Item = Arr[i];
            Engine.MapStatArray[i] = Item.Delta;
        }
        Engine.TreeTimeStat.clear();
        Engine.StartStatBlockNum = Arr[0].BlockNum;
    };
}

global.BlockStatCount = 10;
global.BlockStatCountTime = 10;

function DoNode(Engine)
{
    if(Engine.Del)
        return;
    if(Engine.ROOT_NODE)
        return;
    
    var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
    Engine.MaxLinkedBlockDB2 = CurBlockNum - JINN_CONST.STEP_MINING - JINN_CONST.LINK_HASH_DELTA;
    Engine.MaxLinkedBlockDB = CurBlockNum + 100;
    
    if(Engine.LastCurBlockNum !== CurBlockNum)
    {
        Engine.DoTimeCorrect(1);
        
        Engine.LastCurBlockNum = CurBlockNum;
        
        if(Engine.SendTicket && global.glUseTicket)
        {
            Engine.InitTicket(CurBlockNum - JINN_CONST.STEP_TICKET);
        }
        
        Engine.DoBlockMining(CurBlockNum - JINN_CONST.STEP_MINING);
        Engine.DoMaxLiderTaskArr(CurBlockNum - JINN_CONST.STEP_MAXHASH);
    }
    
    Engine.SendTicket(CurBlockNum - JINN_CONST.STEP_TICKET - 1);
    Engine.SendTicket(CurBlockNum - JINN_CONST.STEP_TICKET);
    
    Engine.SendTx(CurBlockNum - JINN_CONST.STEP_TX - 1);
    Engine.SendTx(CurBlockNum - JINN_CONST.STEP_TX);
    
    for(var delta = JINN_CONST.MAX_DELTA_PROCESSING; delta >= 0; delta--)
    {
        Engine.StartSendLiderArr(CurBlockNum - JINN_CONST.STEP_MAXHASH - delta);
    }
}
