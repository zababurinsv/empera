/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/


module.exports.Init = Init;

function Init(Engine)
{
    Engine.GetTx = function (body,HASH,HashPow)
    {
        var Tx = {};
        Tx.IsTx = 1;
        Tx.num = ReadUintFromArr(body, body.length - 12);
        
        if(HASH)
            Tx.HASH = HASH;
        else
            if(Tx.num >= JINN_CONST.BLOCKNUM_TICKET_ALGO)
                Tx.HASH = sha3(body);
            else
                Tx.HASH = shaarr(body);
        
        Tx.HashTicket = Tx.HASH.slice(0, JINN_CONST.TX_TICKET_HASH_LENGTH);
        Tx.KEY = GetHexFromArr(Tx.HashTicket);
        Tx.body = body;
        if(HashPow)
        {
            Tx.HashPow = HashPow;
            Tx.TimePow = Engine.GetPowPower(HashPow);
        }
        else
        {
            Engine.FillTicket(Tx);
        }
        
        Tx.name = Tx.KEY.substr(0, 6) + "-" + Tx.TimePow;
        
        return Tx;
    };
    
    SERVER.AddTransaction = function (Tr,ToAll)
    {
        var Tx = Engine.GetTx(Tr.body);
        
        if(!Engine.IsValidateTx(Tx, "ERROR SERVER.AddTransaction", Tx.num))
            return  - 4;
        
        var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        
        if(Tx.num < CurBlockNum)
            return  - 3;
        if(Tx.num > CurBlockNum + 20)
            return  - 5;
        
        Engine.AddCurrentProcessingTx(Tx.num, [Tx]);
        
        return 1;
    };
    Engine.CalcTreeHash = CalcTreeHashFromArrBody;
    
    Engine.GetPowPower = GetPowPower;
    
    Engine.GetGenesisBlock = function (BlockNum)
    {
        if(BlockNum >= JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            ToLogTrace("Error GenesisBlock Num = " + BlockNum);
            return undefined;
        }
        
        var Block = SERVER.GenesisBlockHeaderDB(BlockNum);
        Engine.ConvertFromTera(Block, 1, 1);
        
        return Block;
    };
    
    SERVER.GetLinkHashDB = function (Block)
    {
        return Engine.GetLinkDataFromDB(Block);
    };
    
    Engine.GetLinkDataFromDB = function (Block,StructSet)
    {
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
            return ZERO_ARR_32;
        var Num = Block.BlockNum - BLOCK_PROCESSING_LENGTH;
        var PrevBlock = Engine.GetBlockHeaderDB(Num, 1);
        if(!PrevBlock)
        {
            ToLogTrace(" ERROR CALC BLOCK: " + Block.BlockNum + " - prev block NOT Found: " + Num + "  MaxNumBlockDB=" + SERVER.GetMaxNumBlockDB());
            return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        }
        return PrevBlock.SumHash;
    };
    
    Engine.CalcBlockHash = function CalcBlockHash(Block)
    {
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            var Block2 = Engine.GetGenesisBlock(Block.BlockNum);
            Block.DataHash = Block2.DataHash;
            Block.Hash = Block2.Hash;
            Block.PowHash = Block2.PowHash;
            Block.LinkData = ZERO_ARR_32;
            Block.LinkRef = ZERO_ARR_32;
            Block.LinkHash = ZERO_ARR_32;
            
            Block.Power = Engine.GetPowPower(Block.PowHash);
        }
        else
        {
            
            if(!Block.LinkData)
            {
                ToLogTrace("No LinkData on block " + Block.BlockNum);
                Block.LinkData = ZERO_ARR_32;
            }
            if(!Block.LinkRef)
            {
                ToLogTrace("No LinkRef on block " + Block.BlockNum);
                Block.LinkRef = ZERO_ARR_32;
            }
            
            Block.LinkHash = sha3(Block.LinkData.concat(Block.LinkRef));
            
            if(!Block.TreeHash)
                ToLogTrace("No TreeHash on block " + Block.BlockNum);
            
            Block.DataHash = GetSeqHash(Block.BlockNum, Block.LinkHash, Block.TreeHash);
            Block.SeqHash = Block.DataHash;
            Block.AddrHash = Block.MinerHash;
            CalcHashBlockFromSeqAddr(Block);
            Block.Power = GetPowPower(Block.PowHash);
        }
        
        return !IsZeroArr(Block.Hash);
    };
    Engine.CalcHashMaxLider = function (Data,BlockNum)
    {
        Data.BlockNum = BlockNum;
        Data.SeqHash = Data.DataHash;
        Data.AddrHash = Data.MinerHash;
        
        CalcHashBlockFromSeqAddr(Data);
        Data.Power = GetPowPower(Data.PowHash);
    };
    Engine.ConvertToTera = function (Block,bBody)
    {
        if(!Block.LinkHash)
            ToLogTrace("!Block.LinkHash on Block=" + Block.BlockNum);
        if(!Block.MinerHash)
            ToLogTrace("!Block.MinerHash on Block=" + Block.BlockNum);
        if(!Block.DataHash)
            ToLogTrace("!Block.DataHash on Block=" + Block.BlockNum);
        
        Block.PrevHash = Block.LinkHash;
        Block.AddrHash = Block.MinerHash;
        Block.SeqHash = Block.DataHash;
        
        if(bBody && Block.TxData)
        {
            Engine.ConvertBodyToTera(Block);
        }
    };
    
    Engine.ConvertFromTera = function (Block,bBody,bCalcPrevBlockHash)
    {
        if(!Block.PrevHash)
            ToLogTrace("!Block.PrevHash on Block=" + Block.BlockNum);
        if(!Block.AddrHash)
            ToLogTrace("!Block.AddrHash on Block=" + Block.BlockNum);
        if(!Block.SeqHash)
            ToLogTrace("!Block.SeqHash on Block=" + Block.BlockNum);
        
        Block.LinkHash = Block.PrevHash;
        Block.MinerHash = Block.AddrHash;
        Block.DataHash = Block.SeqHash;
        
        if(bBody && Block.arrContent)
        {
            Engine.ConvertBodyFromTera(Block);
        }
        if(bCalcPrevBlockHash)
        {
            Engine.SetBlockDataFromDB(Block);
            
            Block.PrevBlockHash = ZERO_ARR_32;
            if(Block.BlockNum > 0)
            {
                var PrevBlock = Engine.GetBlockHeaderDB(Block.BlockNum - 1, 1);
                if(PrevBlock)
                {
                    Block.PrevBlockHash = PrevBlock.Hash;
                }
            }
        }
    };
    
    Engine.ConvertBodyToTera = function (Block)
    {
        if(Block.TxData)
        {
            var Arr = [];
            for(var i = 0; i < Block.TxData.length; i++)
            {
                Arr.push(Block.TxData[i].body);
            }
            Block.arrContent = Arr;
        }
    };
    
    Engine.ConvertBodyFromTera = function (Block)
    {
        if(Block.arrContent)
        {
            var Arr = [];
            for(var i = 0; i < Block.arrContent.length; i++)
            {
                var Tx = Engine.GetTx(Block.arrContent[i]);
                Arr.push(Tx);
            }
            Block.TxData = Arr;
        }
    };
}
