/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

require("./src");
global.JINN_WARNING = 1;
global.DEBUG_ID = 1;
module.exports.Create = Create;
JINN_CONST.CONSENSUS_PERIOD_TIME = CONSENSUS_PERIOD_TIME;
JINN_CONST.START_CHECK_BLOCKNUM = 50;
JINN_CONST.MAX_PACKET_LENGTH = global.MAX_PACKET_LENGTH;
JINN_CONST.BLOCK_GENESIS_COUNT = BLOCK_GENESIS_COUNT;
JINN_CONST.START_BLOCK_NUM = JINN_CONST.BLOCK_GENESIS_COUNT + 4;
JINN_CONST.DELTA_BLOCKS_FOR_LOAD_ONLY = JINN_CONST.START_BLOCK_NUM + 10;
JINN_CONST.MAX_ITEMS_FOR_LOAD = 100;
JINN_CONST.MAX_BLOCK_SIZE = MAX_BLOCK_SIZE;
JINN_CONST.MAX_DEPTH_FOR_SECONDARY_CHAIN = 100;
JINN_CONST.CACHE_PERIOD_FOR_INVALIDATE = 30;
JINN_EXTERN.GetCurrentBlockNumByTime = global.GetCurrentBlockNumByTime;
function Create(Node)
{
    var Engine = {};
    Engine.ID = 1;
    Engine.IDArr = Node.addrArr;
    Engine.IDStr = Node.addrStr;
    global.CreateNodeEngine(Engine);
    Engine.GetTx = function (body)
    {
        var Tx = {};
        Tx.IsTx = 1;
        Tx.num = ReadUintFromArr(body, body.length - 12);
        if(Tx.num >= JINN_CONST.BLOCKNUM_TICKET_ALGO)
            Tx.HASH = sha3(body);
        else
            Tx.HASH = shaarr(body);
        Tx.KEY = GetHexFromArr(Tx.HASH).substr(0, 2 * JINN_CONST.TX_TICKET_HASH_LENGTH);
        Tx.body = body;
        Tx.HashTicket = Tx.HASH.slice(0, JINN_CONST.TX_TICKET_HASH_LENGTH);
        Engine.FillTicket(Tx);
        Tx.TxID = GetHexFromArr(FullHashTicket.slice(0, JINN_CONST.TX_TICKET_HASH_LENGTH + 6));
        Tx.name = Tx.KEY.substr(0, 6) + "-" + Tx.TimePow;
        Tx.Size = body.length;
        return Tx;
    };
    Engine.CalcTreeHash = CalcTreeHashFromArrBody;
    Engine.CalcBlockHash = function CalcBlockHash(Block)
    {
        Block.SeqHash = SERVER.GetSeqHash(Block.BlockNum, Block.PrevHash, Block.TreeHash);
        CalcHashBlockFromSeqAddr(Block);
        Block.Power = GetPowPower(Block.PowHash);
    };
    Engine.GetPowPower = GetPowPower;
    Engine.GetGenesisBlock = function (Num)
    {
        var Block = SERVER.GenesisBlockHeaderDB(Num);
        return Block;
    };
    Engine.GetNewBlock = function (BlockNum,TxArr,PrevBlock)
    {
        var Block = {};
        Block.BlockNum = BlockNum;
        Block.TxData = TxArr;
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        Block.AddrHash = ZERO_ARR_32;
        Block.TrCount = Block.TxData.length;
        Block.TrDataPos = 0;
        Block.TrDataLen = 0;
        Block.PrevHash = SERVER.GetPrevHash(Block);
        if(!Block.PrevHash)
        {
            ToLog("Cannt create new bloc - not calc PrevHash (not found preb blocks)");
            return undefined;
        }
        Block.SeqHash = SERVER.GetSeqHash(Block.BlockNum, Block.PrevHash, Block.TreeHash);
        CreateHashMinimal(Block, GENERATE_BLOCK_ACCOUNT);
        Block.SumHash = ZERO_ARR_32;
        return Block;
    };
    Engine.CalcHashMaxLider = function (Data,BlockNum,bBlock)
    {
        Data.BlockNum = BlockNum;
        CalcHashBlockFromSeqAddr(Data);
        Data.Hash = Data.PowHash;
        Data.POWER = GetPowPower(Data.Pow);
    };
    Engine.GetMaxNumBlockDB = function ()
    {
        return SERVER.GetMaxNumBlockDB();
    };
    Engine.SaveToDB = function (Block)
    {
        Engine.ToLog("SaveToDB  Block:" + Block.BlockNum);
        return SERVER.WriteBlockDB(Block);
    };
    Engine.GetBlockDB = function (BlockNum)
    {
        return SERVER.ReadBlockDB(BlockNum);
    };
    Engine.Send = function (Method,ItemTo,Data,F)
    {
        ToLog("Send " + Method + " to:" + ItemTo + " DATA:" + JSON.stringify(Data));
    };
    function StartRun(Engine,Period)
    {
        setInterval(function ()
        {
            NextRunEngine(Engine);
        }, Period);
    };
    StartRun(Engine, 100);
    return Engine;
}
