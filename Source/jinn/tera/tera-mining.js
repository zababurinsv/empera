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
    Engine.GetNewBlock = function (BlockNum,TxArr,PrevBlock,bInMemory)
    {
        var Block = {};
        Block.BlockNum = BlockNum;
        Block.TxData = TxArr;
        Block.TreeHash = Engine.CalcTreeHash(Block.BlockNum, Block.TxData);
        Block.MinerHash = ZERO_ARR_32;
        Block.AddrHash = Block.MinerHash;
        Block.TrCount = Block.TxData.length;
        Block.TrDataPos = 0;
        Block.TrDataLen = 0;
        Block.LinkHash = SERVER.GetLinkHashDB(Block);
        if(!Block.LinkHash)
        {
            if(!bInMemory)
            {
                ToLog("Cannt create new bloc - not calc LinkHash (not found prev blocks) on " + Block.BlockNum);
                return undefined;
            }
            Block.LinkHash = ZERO_ARR_32;
        }
        Block.DataHash = SERVER.GetSeqHash(Block.BlockNum, Block.LinkHash, Block.TreeHash);
        Engine.ConvertToTera(Block, 0);
        CreateHashMinimal(Block, GENERATE_BLOCK_ACCOUNT);
        if(!bInMemory && global.USE_MINING && !Block.StartMining)
        {
            Block.StartMining = true;
            global.SetCalcPOW(Block, "FastCalcBlock");
        }
        Engine.ConvertFromTera(Block, 0);
        if(PrevBlock)
            Block.PrevBlockHash = PrevBlock.Hash;
        else
            Block.PrevBlockHash = ZERO_ARR_32;
        return Block;
    };
    SERVER.MiningProcess = function (msg)
    {
        var Block = Engine.GetBlockDB(msg.BlockNum);
        if(Block && Block.Hash && Block.SeqHash && CompareArr(Block.SeqHash, msg.SeqHash) === 0)
        {
            var ValueOld = GetHashFromSeqAddr(Block.SeqHash, Block.AddrHash, Block.BlockNum);
            var ValueMsg = GetHashFromSeqAddr(msg.SeqHash, msg.AddrHash, Block.BlockNum);
            var bWas = 0;
            if(CompareArr(ValueOld.Hash1, ValueMsg.Hash1) > 0)
            {
                var Nonce1 = ReadUintFromArr(msg.AddrHash, 12);
                var DeltaNum1 = ReadUint16FromArr(msg.AddrHash, 24);
                WriteUintToArrOnPos(Block.AddrHash, Nonce1, 12);
                WriteUint16ToArrOnPos(Block.AddrHash, DeltaNum1, 24);
                bWas += 1;
            }
            if(CompareArr(ValueOld.Hash2, ValueMsg.Hash2) > 0)
            {
                var Nonce0 = ReadUintFromArr(msg.AddrHash, 6);
                var Nonce2 = ReadUintFromArr(msg.AddrHash, 18);
                var DeltaNum2 = ReadUint16FromArr(msg.AddrHash, 26);
                WriteUintToArrOnPos(Block.AddrHash, Nonce0, 6);
                WriteUintToArrOnPos(Block.AddrHash, Nonce2, 18);
                WriteUint16ToArrOnPos(Block.AddrHash, DeltaNum2, 26);
                bWas += 2;
            }
            if(!bWas)
                return ;
            var ValueNew = GetHashFromSeqAddr(Block.SeqHash, Block.AddrHash, Block.BlockNum);
            Block.Hash = ValueNew.Hash;
            Block.PowHash = ValueNew.PowHash;
            Block.Power = GetPowPower(Block.PowHash);
            ADD_TO_STAT("MAX:POWER", Block.Power);
            var Power = GetPowPower(Block.PowHash);
            var HashCount = Math.pow(2, Power);
            ADD_HASH_RATE(HashCount);
            var Result = Engine.SaveToDB(Block, 0, 1);
            if(!Result)
                return ;
            Engine.AddHashToMaxLider(Block, Block.BlockNum, 1);
        }
    };
}
