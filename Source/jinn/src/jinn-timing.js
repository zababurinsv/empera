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
    
    Engine.WasCorrectTime = 0;
    Engine.StatArray = [];
    Engine.StepTaskTt = {};
    Engine.StepTaskTx = {};
    Engine.StepTaskMax = {};
    
    Engine.TreeTimeStat = new RBTree(function (a,b)
    {
        if(a.BlockNum !== b.BlockNum)
            return a.BlockNum - b.BlockNum;
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
        
        if(Math.abs(global.DELTA_CURRENT_TIME) > JINN_CONST.INFLATION_TIME_VALUE)
        {
            if(global.DELTA_CURRENT_TIME > 0)
                NewDelta -= JINN_CONST.INFLATION_TIME_VALUE;
            else
                if(global.DELTA_CURRENT_TIME < 0)
                    NewDelta += JINN_CONST.INFLATION_TIME_VALUE;
        }
        
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
        
        var MinCount = JINN_CONST.MIN_COUNT_FOR_CORRECT_TIME;
        if(!Engine.WasCorrectTime)
            MinCount = MinCount * 2;
        
        if(Arr.length < MinCount)
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
        
        if(Count < MinCount / 2)
            return;
        var AvgSum2 = Sum / Count;
        Engine.CorrectTimeByDelta( - Math.floor(1000 * AvgSum2));
    };
    
    Engine.GetTimeStatArr = function (StartBlockNum)
    {
        var Arr = [];
        var find = {BlockNum:StartBlockNum, Hash:ZERO_ARR_32};
        var it = Engine.TreeTimeStat.lowerBound(find);
        while(it)
        {
            it.next();
            var item = it.data();
            if(!item)
                break;
            
            Arr.push(item.Power);
            Arr.push(item.BlockNum);
        }
        return Arr;
    };
    Engine.DoTimeCorrect = function (bReglament)
    {
        
        if(bReglament)
            Engine.ClearOldStatTree();
        
        var MaxItem = Engine.MaxTimeStatus;
        if(!MaxItem.BlockNum)
            return;
        
        if(Engine.TreeTimeStat.find({Hash:MaxItem.Hash, BlockNum:MaxItem.BlockNum}))
            return;
        
        var DeltaStart = Date.now() - MaxItem.StartTime;
        if(DeltaStart < 1000)
            return;
        
        Engine.TreeTimeStat.insert({Hash:MaxItem.Hash, BlockNum:MaxItem.BlockNum, Power:MaxItem.Power});
        
        JINN_STAT.DeltaTime = MaxItem.Delta;
        var Delta = MaxItem.Delta - JINN_CONST.STEP_MAXHASH;
        
        Engine.StatArray.push(Delta);
        Engine.MaxTimeStatus = {Power:0, Hash:MAX_ARR_32, PowHash:MAX_ARR_32};
        
        Engine.CorrectTimeByArr(Engine.StatArray);
    };
    
    Engine.AddMaxHashToTimeStat = function (Item,BlockNum)
    {
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
            if(Engine.TreeTimeStat.find({Hash:Item.Hash, BlockNum:BlockNum}))
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
        while(1)
        {
            var Item = Engine.TreeTimeStat.max();
            if(!Item || Item.BlockNum >= OldBlockNum)
                break;
            Engine.TreeTimeStat.remove(Item);
        }
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
    
    if(Engine.LastCurBlockNum !== CurBlockNum)
    {
        Engine.DoTimeCorrect(1);
        
        Engine.LastCurBlockNum = CurBlockNum;
        
        Engine.DoBlockMining(CurBlockNum - JINN_CONST.STEP_MINING);
        Engine.DoMaxLiderTaskArr(CurBlockNum - JINN_CONST.STEP_MAXHASH);
    }
    Engine.StepTaskTt[CurBlockNum - JINN_CONST.STEP_TICKET] = 1;
    Engine.StepTaskTt[CurBlockNum - JINN_CONST.STEP_TICKET - 1] = 1;
    
    Engine.StepTaskTx[CurBlockNum - JINN_CONST.STEP_TX] = 1;
    Engine.StepTaskTx[CurBlockNum - JINN_CONST.STEP_TX - 1] = 1;
    
    Engine.StepTaskMax[CurBlockNum - JINN_CONST.STEP_MAXHASH] = 1;
    Engine.StepTaskMax[CurBlockNum - JINN_CONST.STEP_MAXHASH - 1] = 1;
    Engine.StepTaskMax[CurBlockNum - JINN_CONST.STEP_MAXHASH - 2] = 1;
    Engine.StepTaskMax[CurBlockNum - JINN_CONST.STEP_MAXHASH - 3] = 1;
    
    for(var BlockNum = CurBlockNum - JINN_CONST.STEP_LAST - JINN_CONST.MAX_DELTA_PROCESSING; BlockNum <= CurBlockNum - JINN_CONST.STEP_TICKET; BlockNum++)
    {
        
        if(Engine.StepTaskTt[BlockNum])
            Engine.SendTicket(BlockNum);
        
        if(Engine.StepTaskTx[BlockNum])
            Engine.SendTx(BlockNum);
        
        if(Engine.StepTaskMax[BlockNum])
            Engine.StartSendMaxHash(BlockNum);
    }
    Engine.StepTaskTt = {};
    Engine.StepTaskTx = {};
    Engine.StepTaskMax = {};
}
