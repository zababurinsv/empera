/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/


global.PROCESS_NAME = "CONVERT";

const crypto = require('crypto');
require("../core/constant");
global.DATA_PATH = GetNormalPathString(global.DATA_PATH);
global.CODE_PATH = GetNormalPathString(global.CODE_PATH);
require("../core/library");


global.HTTP_PORT_NUMBER = 0;
var CServerDB = require("../core/transaction-validator");

var KeyPair = crypto.createECDH('secp256k1');
KeyPair.setPrivateKey(Buffer.from([77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77, 77,
77, 77, 77, 77, 77, 77, 77, 77, 77, 77]));
global.SERVER = new CServerDB(KeyPair, undefined, undefined, false, true);

var MAX_BLOCK_NUM = 63510000;

function DoUpDate()
{
    SERVER.Close();
    
    ToLog("*****************START CONVERT BLOCKCHAIN DB TO JINN FORMAT");
    UpdateToJinn();
    ToLog("*****************END CONVERT BLOCKCHAIN DB TO JINN FORMAT");
}

global.PROCESS_NAME = "MAIN";
var Engine = GetJinEngine();
DoUpDate();

function UpdateToJinn()
{
    if(global.JINN_MODE)
        return  - 2;
    
    SERVER.ReadStateTX();
    if(SERVER.BlockNumDBMin)
    {
        ToLog("Cannt convert NOT FULL BLOCKCHAIN DB. Load the complete database from scratch.");
        process.exit();
        return;
    }
    var BlockNum = Engine.GetMaxNumBlockDB();
    var BlockNumJINN = Engine.DB.GetMaxMainIndex();
    if(BlockNumJINN < BlockNum)
        BlockNum = BlockNumJINN;
    if(SERVER.BlockNumDBMin && BlockNum < SERVER.BlockNumDBMin)
        BlockNum = SERVER.BlockNumDBMin;
    while(BlockNum > SERVER.BlockNumDBMin)
    {
        var BlockOld = SERVER.ReadBlockDB(BlockNum);
        var BlockNew = Engine.DB.ReadBlockMain(BlockNum);
        if(BlockOld && BlockNew)
        {
            if(IsEqArr(BlockOld.SumHash, BlockNew.SumHash))
            {
                break;
            }
        }
        BlockNum % 100 === 0 && ToLog("Jinn-find startnum: " + BlockNum, 1);
        BlockNum--;
    }
    
    var StartNum = BlockNum;
    
    var PrevBlock = undefined;
    if(StartNum > SERVER.BlockNumDBMin)
    {
        var PrevBlock = Engine.DB.ReadBlockMain(StartNum);
        if(!PrevBlock)
            return  - 1;
    }
    
    var BlockNum = StartNum + 1;
    if(BlockNum < 0)
        BlockNum = 0;
    
    ToLog("*********** Start convert from Block=" + BlockNum);
    
    if(BlockNum >= MAX_BLOCK_NUM)
    {
        ToLog("*********** FINISH CONVERT at Block=" + BlockNum);
        process.exit();
        return;
    }
    
    var Count = 0;
    while(1)
    {
        
        var Block = SERVER.ReadBlockDB(BlockNum);
        if(!Block)
        {
            ToLog("*********** Finish convert on Block=" + BlockNum);
            break;
        }
        
        Engine.ConvertFromTera(Block, 1);
        
        if(PrevBlock)
        {
            Block.PrevSumHash = PrevBlock.SumHash;
            Block.PrevSumPow = PrevBlock.SumPow;
        }
        else
        {
            Block.PrevSumHash = ZERO_ARR_32;
            Block.PrevSumPow = 0;
        }
        
        var SumPow1 = Block.SumPow;
        var Hash1 = GetHexFromArr(Block.Hash);
        var SumHash1 = GetHexFromArr(Block.SumHash);
        Engine.CalcBlockHash(Block);
        Engine.CalcSumHash(Block);
        var SumPow2 = Block.SumPow;
        var Hash2 = GetHexFromArr(Block.Hash);
        var SumHash2 = GetHexFromArr(Block.SumHash);
        
        if(Hash1 !== Hash2)
        {
            ToLog("Error calc hash  on Block=" + BlockNum);
            ToLog("Hash1=" + Hash1 + " Hash2=" + Hash2, 2);
            break;
        }
        if(SumHash1 !== SumHash2)
        {
            ToLog("Error calc hash  on Block=" + BlockNum);
            ToLog("SumHash1=" + SumHash1 + " SumHash2=" + SumHash2, 2);
            break;
        }
        
        var Result = Engine.DB.WriteBlockMain(Block);
        if(!Result)
        {
            ToLog("Error convert Block=" + BlockNum);
            ToLog("Hash=" + GetHexFromArr(Block.Hash) + " PrevHash=" + GetHexFromArr(Block.PrevSumHash), 2);
            
            break;
        }
        
        Block2 = Engine.DB.ReadBlockMain(Block.BlockNum);
        Hash2 = GetHexFromArr(Block.Hash);
        SumHash2 = GetHexFromArr(Block.SumHash);
        
        if(Hash1 !== Hash2)
        {
            ToLog("--Error calc hash  on Block=" + BlockNum);
            ToLog("Hash1=" + Hash1 + " Hash2=" + Hash2, 2);
            break;
        }
        if(SumHash1 !== SumHash2)
        {
            ToLog("--Error calc hash  on Block=" + BlockNum);
            ToLog("SumHash1=" + SumHash1 + " SumHash2=" + SumHash2, 2);
            break;
        }
        
        if(Block.arrContentResult && Block.arrContentResult.length)
        {
            Engine.DBResult.WriteBodyResult(BlockNum, Block.arrContentResult);
        }
        
        Count++;
        
        PrevBlock = Block;
        
        BlockNum % 10000 === 0 && ToLog("Jinn-update: " + BlockNum);
        BlockNum++;
    }
    
    return Count;
}

function GetJinEngine()
{
    
    var Map = {"Block":1, "BlockDB":1, "Log":1, };
    
    require("../jinn/tera");
    var Engine = {};
    global.CreateNodeEngine(Engine, Map);
    require("../jinn/tera/tera-hash").Init(Engine);
    
    return Engine;
}
