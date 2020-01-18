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
            throw "Error GenesisBlock Num = " + BlockNum;
        var Block = SERVER.GenesisBlockHeaderDB(BlockNum);
        Engine.ConvertFromTera(Block, 1);
        return Block;
    };
    Engine.CalcBlockHash = function CalcBlockHash(Block)
    {
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
        {
            var Block2 = Engine.GetGenesisBlock(Block.BlockNum);
            Block.DataHash = Block2.DataHash;
            Block.Hash = Block2.Hash;
            Block.PowHash = Block2.PowHash;
            Block.Power = Block2.Power;
        }
        else
        {
            if(!Block.LinkHash || IsZeroArr(Block.LinkHash))
                throw "Zero Block.LinkHash";
            if(!Block.TreeHash)
                throw "No Block.TreeHash";
            Block.DataHash = SERVER.GetSeqHash(Block.BlockNum, Block.LinkHash, Block.TreeHash);
            Block.SeqHash = Block.DataHash;
            Block.AddrHash = Block.MinerHash;
            CalcHashBlockFromSeqAddr(Block);
            Block.Power = GetPowPower(Block.PowHash);
        }
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
        Block.PrevHash = Block.LinkHash;
        Block.AddrHash = Block.MinerHash;
        Block.SeqHash = Block.DataHash;
        if(!Block.PrevHash)
            throw "!Block.PrevHash";
        if(!Block.AddrHash)
            throw "!Block.AddrHash";
        if(!Block.SeqHash)
            throw "!Block.SeqHash";
        if(bBody && Block.TxData)
        {
            var Arr = [];
            for(var i = 0; i < Block.TxData.length; i++)
            {
                Arr.push(Block.TxData[i].body);
            }
            Block.arrContent = Arr;
        }
    };
    Engine.ConvertFromTera = function (Block,bBody)
    {
        Block.LinkHash = Block.PrevHash;
        Block.MinerHash = Block.AddrHash;
        Block.DataHash = Block.SeqHash;
        Block.PrevBlockHash = ZERO_ARR_32;
        if(Block.BlockNum > 0)
        {
            var PrevBlock;
            if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
                PrevBlock = SERVER.GenesisBlockHeaderDB(Block.BlockNum - 1);
            else
                PrevBlock = SERVER.ReadBlockHeaderDB(Block.BlockNum - 1);
            if(PrevBlock)
                Block.PrevBlockHash = PrevBlock.Hash;
        }
        if(bBody && Block.arrContent)
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
