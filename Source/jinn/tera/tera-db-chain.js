/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

module.exports.Init = Init;

const DBRow = require("../../core/db/db-row");
const DBItem = require("./tera-db-item");

var TestMode = 2;



global.TEST_DB_CHAIN = 1;

global.DB_ITEM_FORMAT = {VersionDB:"byte", TreeHash:"hash", AddrHash:"hash", PrevHash:"hash", SumHash:"hash", SumPow:"uint",
    TrDataPos:"uint", TrDataLen:"uint32", Reserv500:"uint", PrevBlockHash:"hash", BodyLinkVer:"uint", FirstEmptyBodyNum:"uint",
    FirstEmptyBodyHash:"hash", PrevPos:"uint", HeadNum:"uint", HeadRow:"uint16", HeadDeltaSum:"uint", StartVersion:"uint32", Reserv:"byte",
};
const ITEM_SIZE = SerializeLib.GetBufferFromObject({}, DB_ITEM_FORMAT, {}).length;

const DB_ITEM_FORMATWRK = {};

const bWriteMode = (global.PROCESS_NAME === "MAIN");

function Init(Engine)
{
    if(TestMode === 0)
        return ;
    
    Engine.InitChainDB = function ()
    {
        Engine.ChainDBBlockMin = 0;
        if(TestMode === 1)
        {
            Engine.DBChainPos = new DBRow("chain", 4, "{Position:uint32}", !bWriteMode, "BlockNum");
            Engine.DBChainBlock = new DBRow("chain-body", ITEM_SIZE, DB_ITEM_FORMAT, !bWriteMode, "Position");
            
            if(Engine.DBChainBlock.GetMaxNum() ===  - 1)
                Engine.DBChainBlock.Write({Position:0});
        }
        else
            if(TestMode === 2 || TestMode === 22)
            {
                if(TestMode === 2)
                    Engine.DBChainBlock = new DBItem("block-body", ITEM_SIZE, DB_ITEM_FORMAT, !bWriteMode);
                else
                    Engine.DBChainBlock = new DBItem("chain-body", ITEM_SIZE, DB_ITEM_FORMAT, !bWriteMode);
                
                Engine.DBChainPos = new DBRow("chain", 4, "{Position:uint32}", !bWriteMode, "BlockNum");
            }
            else
                if(TestMode === 3)
                {
                    Engine.DBChainItem = new DBRow("chain-item", 3000, DB_CHAIN_FORMAT, !bWriteMode, "BlockNum");
                }
    };
    
    Engine.ClearChainDB = function ()
    {
        
        Engine.InitChainDB();
        if(TestMode === 1)
        {
            Engine.DBChainBlock.Truncate(0);
            
            Engine.DBChainPos.Truncate( - 1);
        }
        else
            if(TestMode === 2 || TestMode === 22)
            {
                Engine.DBChainPos.Truncate( - 1);
            }
            else
                if(TestMode === 3)
                {
                    Engine.DBChainItem.Truncate( - 1);
                }
    };
    
    Engine.GetMaxChainDBNum1 = function ()
    {
        return Engine.DBChainPos.GetMaxNum();
    };
    Engine.WriteChainToDB1 = function (Chain,bNoTest)
    {
        if(Chain.BlockNum < 1)
            return ;
        
        if(Chain.BlockNum < Engine.ChainDBBlockMin)
            Engine.ChainDBBlockMin = Chain.BlockNum;
        var LastPosition = 0;
        for(var i = 0; i < Chain.ArrBlock.length; i++)
        {
            var Block = Chain.ArrBlock[i];
            Block.VersionDB = global.DB_VERSION;
            Block.PrevPos = LastPosition;
            
            Engine.ConvertToTera(Block, 1);
            
            Block.StartVersion = global.StartVersion;
            Block.Position = undefined;
            if(!Engine.DBChainBlock.Write(Block))
            {
                continue;
            }
            
            LastPosition = Block.Position;
        }
        
        Chain.Position = 1 + LastPosition;
        Engine.DBChainPos.Write(Chain);
        
        if(!bNoTest)
            if(!Engine.ChechkChainFromDB(Chain))
            {
                ToLog("****************LastPosition=" + LastPosition + " ArrBlock=" + Chain.ArrBlock.length);
                var Chain1 = Engine.ReadChainFromDB(Chain.BlockNum);
                Engine.WriteChainToDB1(Chain, 1);
                var Chain2 = Engine.ReadChainFromDB(Chain.BlockNum);
            }
    };
    
    Engine.ReadChainFromDB1 = function (BlockNum,bTest)
    {
        BlockNum = Math.trunc(BlockNum);
        if(BlockNum < 1)
            return undefined;
        var Item = Engine.DBChainPos.Read(BlockNum);
        if(!Item || !Item.Position)
        {
            return undefined;
        }
        var Position = Item.Position - 1;
        var Chain = {BlockNum:BlockNum, ArrBlock:[]};
        while(Position)
        {
            var Block = Engine.DBChainBlock.Read(Position);
            if(!Block)
            {
                ToLogTrace("2 Error read block: " + BlockNum);
                return undefined;
            }
            
            if(Block.StartVersion !== global.StartVersion)
                ToLog("Err Block.StartVersion=" + Block.StartVersion + "/" + global.StartVersion + " on Block=" + Block.BlockNum);
            
            if(SERVER.PrepareBlockFields(Block, BlockNum))
            {
                Engine.ConvertFromTera(Block, 1);
                
                if(!IsZeroArr(Block.TreeHash) && (Block.TxData && Block.TxData.length === 0))
                    Block.TxData = undefined;
                
                Chain.ArrBlock.unshift(Block);
            }
            
            Position = Block.PrevPos;
        }
        return Chain;
    };
    Engine.GetMaxChainDBNum2 = function ()
    {
        return Engine.DBChainPos.GetMaxNum();
    };
    
    Engine.WriteChainToDB2 = function (Chain)
    {
        if(Chain.BlockNum < 1)
            return ;
        
        if(Chain.BlockNum < Engine.ChainDBBlockMin)
            Engine.ChainDBBlockMin = Chain.BlockNum;
        var LastPosition = 0;
        for(var i = 0; i < Chain.ArrBlock.length; i++)
        {
            var Block = Chain.ArrBlock[i];
            Engine.ConvertToTera(Block, 1);
            var Ret;
            if(Block.TxData && Block.TxData.length && !Block.TrDataLen)
            {
                Ret = SERVER.WriteBodyDB(Block);
            }
            else
                Ret = 1;
            if(Ret)
            {
                Block.Reserv500 = 222;
                Block.VersionDB = global.DB_VERSION;
                Block.PrevPos = LastPosition;
                Block.StartVersion = global.StartVersion;
                if(!Engine.DBChainBlock.Write(Block))
                    continue;
                if(TEST_DB_CHAIN)
                {
                    if(!Block.SumPow)
                        Block.SumPow = 0;
                    
                    var Block2 = Engine.DBChainBlock.Read(Block.Position);
                    if(!Block2 || Block2.VersionDB !== Block.VersionDB || Block2.PrevPos !== Block.PrevPos || Block2.SumPow !== Block.SumPow)
                    {
                        ToLogTrace("Error read block: " + Block.BlockNum + " on  pos=" + Block.Position + " PrevPos=" + Block2.PrevPos + "/" + Block.PrevPos + " SumPow=" + Block2.SumPow + "/" + Block.SumPow);
                    }
                }
                
                LastPosition = Block.Position;
            }
        }
        Engine.DBChainPos.Write({BlockNum:Chain.BlockNum, Position:LastPosition + 1});
        
        Engine.ChechkChainFromDB(Chain);
    };
    
    Engine.ReadChainFromDB2 = function (BlockNum,bTest)
    {
        BlockNum = Math.trunc(BlockNum);
        if(BlockNum < 1)
            return undefined;
        var Item = Engine.DBChainPos.Read(BlockNum);
        if(!Item || !Item.Position)
        {
            return undefined;
        }
        var Position = Item.Position - 1;
        
        var Chain = {BlockNum:BlockNum, ArrBlock:[]};
        while(Position)
        {
            var Block = Engine.DBChainBlock.Read(Position);
            if(!Block)
            {
                ToLogTrace("Error read block: " + BlockNum);
            }
            
            if(Block.StartVersion !== global.StartVersion)
                ToLog("Err Block.StartVersion=" + Block.StartVersion + "/" + global.StartVersion);
            
            var bAdd = 0;
            if(SERVER.PrepareBlockFields(Block, BlockNum))
            {
                bAdd = 0;
                if(Block && Block.TrDataLen)
                {
                    bAdd = SERVER.ReadBlockBodyDB(Block);
                }
                else
                {
                    bAdd = 1;
                }
            }
            
            if(bAdd)
            {
                Engine.ConvertFromTera(Block, 1);
                
                if(!IsZeroArr(Block.TreeHash) && (Block.TxData && Block.TxData.length === 0))
                    Block.TxData = undefined;
                
                Chain.ArrBlock.unshift(Block);
            }
            
            Position = Block.PrevPos;
            if(TEST_DB_CHAIN)
            {
                if(Block.PrevPos > 1000000000000)
                    ToLogTrace("Error PrevPos: " + Block.PrevPos);
            }
        }
        
        return Chain;
    };
    
    Engine.GetMaxChainDBNum3 = function ()
    {
        return Engine.DBChainItem.GetMaxNum();
    };
    Engine.WriteChainToDB3 = function (Chain)
    {
        if(Chain.BlockNum < 1)
            return ;
        
        Chain.SaveTime = Date.now();
        if(Chain.BlockNum < Engine.ChainDBBlockMin)
            Engine.ChainDBBlockMin = Chain.BlockNum;
        
        Chain.StartVersion = global.StartVersion;
        for(var i = 0; i < Chain.ArrBlock.length; i++)
        {
            var Block = Chain.ArrBlock[i];
            Block.StartVersion = global.StartVersion;
            Block.VersionDB = global.DB_VERSION;
        }
        
        var Result = Engine.DBChainItem.Write(Chain);
        
        Engine.ChechkChainFromDB(Chain);
        
        return Result;
    };
    Engine.ReadChainFromDB3 = function (BlockNum)
    {
        if(BlockNum < 1)
            return undefined;
        var Chain = Engine.DBChainItem.Read(BlockNum);
        if(!Chain || !Chain.StartVersion)
            return undefined;
        
        if(Chain.StartVersion !== global.StartVersion)
        {
            ToLog("Err Chain.StartVersion=" + Chain.StartVersion + "/" + global.StartVersion + " on block=" + BlockNum + " GetMaxNum=" + Engine.DBChainItem.GetMaxNum());
            ToLog(JSON.stringify(Chain));
        }
        
        if(Chain.BlockNum !== BlockNum)
            ToLog("ReadChainFromDB3 Chain.BlockNum=" + Chain.BlockNum + "/" + BlockNum);
        
        for(var n = 0; n < Chain.ArrBlock.length; n++)
        {
            var Block = Chain.ArrBlock[n];
            if(Block.BlockNum !== BlockNum)
                ToLog("ReadChainFromDB3: Block.BlockNum!==BlockNum: " + Block.BlockNum + "/" + BlockNum);
            Engine.CalcBlockHash(Block);
            for(var i = 0; i < Block.TxData.length; i++)
            {
                var Element = Block.TxData[i];
                var Tx = Engine.GetTx(Element.body, Element.HASH, Element.HashPow);
                Block.TxData[i] = Tx;
                CheckTx("ReadChainFromDB3:" + n, Tx, Block.BlockNum, 1);
            }
            
            if(!IsZeroArr(Block.TreeHash) && (Block.TxData && Block.TxData.length === 0))
                Block.TxData = undefined;
        }
        
        return Chain;
    };
    Engine.ChechkChainFromDB = function (Chain)
    {
        var Result = 1;
        if(!TEST_DB_CHAIN)
            return Result;
        var Chain2 = Engine.ReadChainFromDB(Chain.BlockNum);
        if(!Chain2)
        {
            ToLog("MODE:" + TestMode + " ChechkChainFromDB !Chain2 on Block=" + Chain.BlockNum + "  GetMaxNum=" + Engine.GetMaxChainDBNum());
            Result = 0;
        }
        else
        {
            if(Chain2.BlockNum !== Chain.BlockNum || Chain2.StartVersion !== Chain.StartVersion || Chain2.ArrBlock.length !== Chain.ArrBlock.length)
            {
                ToLog("MODE:" + TestMode + " ChechkChainFromDB Chain.BlockNum=" + Chain2.BlockNum + "/" + Chain.BlockNum + "StartVersion=" + Chain2.StartVersion + "/" + Chain.StartVersion + "  ArrBlock=" + Chain2.ArrBlock.length + "/" + Chain.ArrBlock.length);
                Result = 0;
            }
            
            for(var i = 0; i < Chain2.ArrBlock.length; i++)
            {
                var Block = Chain2.ArrBlock[i];
                
                if(Block.StartVersion !== global.StartVersion)
                {
                    ToLog("MODE:" + TestMode + " Err Block.StartVersion=" + Block.StartVersion + "/" + global.StartVersion);
                    Result = 0;
                }
                
                if(Block.VersionDB !== global.DB_VERSION)
                {
                    ToLogTrace("MODE:" + TestMode + " Err VersionDB=" + Block.VersionDB);
                    Result = 0;
                }
            }
        }
        
        return Result;
    };
    Engine.InitChainDB();
    
    var StrTestMode = TestMode;
    if(StrTestMode === 22)
        StrTestMode = 2;
    Engine.WriteChainToDB = Engine["WriteChainToDB" + StrTestMode];
    Engine.ReadChainFromDB = Engine["ReadChainFromDB" + StrTestMode];
    Engine.GetMaxChainDBNum = Engine["GetMaxChainDBNum" + StrTestMode];
}
