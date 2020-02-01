/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2020 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

"use strict";
const fs = require('fs');
const DBLib = require("./db");
const DBRow = require("./db-row");
global.BlockDB = new DBLib();
global.BLOCK_HEADER_SIZE = 150;
const FILE_NAME_HEADER = "block-header";
const FILE_NAME_BODY = "block-body";
const FORMAT_STREAM_HEADER = "{\
    VersionDB:byte,\
    TreeHash:hash,\
    AddrHash:hash,\
    PrevHash:hash,\
    SumHash:hash,\
    SumPow:uint,\
    TrDataPos:uint,\
    TrDataLen:uint32,\
    Reserv500:uint\
    }";
const WorkStructStreamHeader = {};
global.BLOCK_HEADER_SIZE2 = 6;
const FORMAT_HEADER_VERSION2 = "{FilePos:uint}";
const FILE_NAME_HEADER2 = "block-header2";
const WorkStructHeader2 = {};
const DEFAULT_DB_VERSION = 2;
module.exports = class CDB extends require("../code")
{
    constructor(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
    {
        super(SetKeyPair, RunIP, RunPort, UseRNDHeader, bVirtual)
        var bWriteMode = (global.PROCESS_NAME === "MAIN");
        global.DB_VERSION = DEFAULT_DB_VERSION
        var FileItem1 = BlockDB.OpenDBFile(FILE_NAME_HEADER, bWriteMode);
        var FileItem2 = BlockDB.OpenDBFile(FILE_NAME_HEADER2, bWriteMode);
        if(FileItem2.size)
            global.DB_VERSION = 2
        else
            if(FileItem1.size)
                global.DB_VERSION = 1
        BlockDB.OpenDBFile(FILE_NAME_BODY, bWriteMode)
        this.DBHeader100 = new DBRow("block-header100", 32 + 32, "{Hash100:hash,Hash:hash}", !bWriteMode)
        this.BlockNumDB = 0
        this.BlockNumDBMin = 0
        this.ClearBufMap()
        setTimeout(function ()
        {
            SERVER.ReadStateTX()
        }, 10)
    }
    ReadStateTX()
    {
        var StateTX = DApps.Accounts.DBStateTX.Read(0);
        if(StateTX)
        {
            this.BlockNumDBMin = StateTX.BlockNumMin
        }
    }
    LoadMemBlocksOnStart()
    {
        this.CurrentBlockNum = GetCurrentBlockNumByTime()
        for(var i = this.BlockNumDB - BLOCK_COUNT_IN_MEMORY; i <= this.BlockNumDB; i++)
            if(i >= 0)
            {
                if(i >= this.BlockNumDB - BLOCK_PROCESSING_LENGTH * 5)
                    this.GetBlock(i, true, true)
                else
                    this.GetBlock(i, true, false)
            }
    }
    GetMaxNumBlockDB()
    {
        var FileItem, BlockNum;
        if(global.DB_VERSION === 2)
        {
            FileItem = BlockDB.OpenDBFile(FILE_NAME_HEADER2)
            BlockNum = (FileItem.size / BLOCK_HEADER_SIZE2) - 1
        }
        else
        {
            FileItem = BlockDB.OpenDBFile(FILE_NAME_HEADER)
            BlockNum = (FileItem.size / BLOCK_HEADER_SIZE) - 1
        }
        return BlockNum;
    }
    FindStartBlockNum()
    {
        this.ReadStateTX()
        var BlockNum = this.GetMaxNumBlockDB();
        if(global.NO_CHECK_BLOCKNUM_ONSTART)
        {
            this.BlockNumDB = this.CheckBlocksOnStartFoward(BlockNum - 2, 0)
            ToLog("START_BLOCK_NUM:" + this.BlockNumDB, 2)
            return ;
        }
        BlockNum = this.CheckBlocksOnStartReverse(BlockNum)
        this.BlockNumDB = this.CheckBlocksOnStartFoward(BlockNum - 2000, 0)
        this.BlockNumDB = this.CheckBlocksOnStartFoward(this.BlockNumDB - 100, 1)
        if(this.BlockNumDB >= BLOCK_PROCESSING_LENGTH2)
        {
            this.TruncateBlockDB(this.BlockNumDB)
        }
        ToLog("START_BLOCK_NUM:" + this.BlockNumDB, 2)
        this.CheckOnStartComplete = 1
    }
    CheckBlocksOnStartReverse(StartNum)
    {
        var delta = 1;
        var Count = 0;
        var PrevBlock;
        for(var num = StartNum; num >= this.BlockNumDBMin + BLOCK_PROCESSING_LENGTH2; num -= delta)
        {
            var Block = this.ReadBlockHeaderDB(num);
            if(!Block || IsZeroArr(Block.SumHash))
            {
                delta++
                Count = 0
                continue;
            }
            var PrevBlock = this.ReadBlockHeaderDB(num - 1);
            if(!PrevBlock || IsZeroArr(PrevBlock.SumHash))
            {
                Count = 0
                continue;
            }
            var SumHash = shaarr2(PrevBlock.SumHash, Block.Hash);
            if(CompareArr(SumHash, Block.SumHash) === 0)
            {
                delta = 1
                Count++
                if(Count > COUNT_BLOCKS_FOR_LOAD / 10)
                    return num;
            }
            else
            {
                delta++
                Count = 0
            }
        }
        return 0;
    }
    CheckBlocksOnStartFoward(StartNum, bCheckBody)
    {
        var PrevBlock;
        if(StartNum < this.BlockNumDBMin + BLOCK_PROCESSING_LENGTH2)
            StartNum = this.BlockNumDBMin + BLOCK_PROCESSING_LENGTH2
        var MaxNum = DApps.Accounts.GetHashedMaxBlockNum();
        var BlockNumTime = GetCurrentBlockNumByTime();
        if(BlockNumTime < MaxNum)
            MaxNum = BlockNumTime
        var arr = [];
        for(var num = StartNum; num <= MaxNum; num++)
        {
            var Block;
            if(bCheckBody)
                Block = this.ReadBlockDB(num)
            else
                Block = this.ReadBlockHeaderDB(num)
            if(!Block)
                return num > 0 ? num - 1 : 0;
            if(num % 100000 === 0)
                ToLog("CheckBlocksOnStartFoward: " + num)
            if(bCheckBody)
            {
                var TreeHash = CalcTreeHashFromArrBody(Block.BlockNum, Block.arrContent);
                if(CompareArr(Block.TreeHash, TreeHash) !== 0)
                {
                    ToLog("BAD TreeHash block=" + Block.BlockNum)
                    return num > 0 ? num - 1 : 0;
                }
            }
            if(PrevBlock)
            {
                if(arr.length !== BLOCK_PROCESSING_LENGTH)
                {
                    var start = num - BLOCK_PROCESSING_LENGTH2;
                    for(var n = 0; n < BLOCK_PROCESSING_LENGTH; n++)
                    {
                        var Prev = this.ReadBlockHeaderDB(start + n);
                        arr.push(Prev.Hash)
                    }
                }
                else
                {
                    arr.shift()
                    var Prev = this.ReadBlockHeaderDB(num - BLOCK_PROCESSING_LENGTH - 1);
                    arr.push(Prev.Hash)
                }
                var PrevHash = CalcHashFromArray(arr, true);
                var SeqHash = this.GetSeqHash(Block.BlockNum, PrevHash, Block.TreeHash);
                var Value = GetHashFromSeqAddr(SeqHash, Block.AddrHash, Block.BlockNum, PrevHash);
                if(CompareArr(Value.Hash, Block.Hash) !== 0)
                {
                    ToLog("=================== FIND ERR Hash in " + Block.BlockNum + "  bCheckBody=" + bCheckBody)
                    return num > 0 ? num - 1 : 0;
                }
                var SumHash = shaarr2(PrevBlock.SumHash, Block.Hash);
                if(CompareArr(SumHash, Block.SumHash) !== 0)
                {
                    ToLog("=================== FIND ERR SumHash in " + Block.BlockNum)
                    return num > 0 ? num - 1 : 0;
                }
            }
            PrevBlock = Block
        }
        return num > 0 ? num - 1 : 0;
    }
    WriteBlockDB(Block)
    {
        var startTime = process.hrtime();
        if(Block.TrCount === 0 && !IsZeroArr(Block.TreeHash))
        {
            ToLogTrace("ERROR WRITE TrCount BLOCK:" + Block.BlockNum)
            throw "ERROR WRITE";
        }
        if(Block.LinkHash)
            Block.PrevHash = Block.LinkHash
        var Ret = this.WriteBodyDB(Block);
        if(Ret)
        {
            Ret = this.WriteBlockDBFinaly(Block)
        }
        ADD_TO_STAT_TIME("MAX:WriteBlockDB", startTime)
        ADD_TO_STAT_TIME("WriteBlockDB", startTime)
        return Ret;
    }
    WriteBlockDBFinaly(Block)
    {
        var Ret = this.WriteBlockHeaderDB(Block);
        if(Ret)
        {
            if(Block.TrDataLen === 0 && !IsZeroArr(Block.TreeHash))
            {
                ToLogTrace("ERROR WRITE FINAL TrDataLen BLOCK")
                throw "ERROR WRITE";
            }
            this.OnWriteBlock(Block)
            if(Block.BlockNum > this.BlockNumDBMin)
                this.BlockNumDB = Block.BlockNum
            Block.bSave = true
        }
        return Ret;
    }
    PreSaveDataTreeToDB(Block)
    {
        var Ret = this.WriteBodyDB(Block);
        if(Ret)
        {
            Ret = this.WriteBlockHeaderDB(Block, 1)
        }
        return Ret;
    }
    WriteBodyResultDB(Block)
    {
        var arrTr = Block.arrContentResult;
        if(Block.TrDataPos && Block.TrDataLen && Block.VersionBody && arrTr && arrTr.length)
        {
            var FileItem = BlockDB.OpenDBFile(FILE_NAME_BODY, 1);
            var FD = FileItem.fd;
            var Size = arrTr.length * 6;
            var Position = Block.TrDataPos + Block.TrDataLen - Size;
            if(FileItem.size < Position + Size)
            {
                TO_ERROR_LOG("DB", 241, "Error Position in WriteBodyResultDB on block: " + Block.BlockNum)
                return false;
            }
            var BufWrite = BufLib.GetNewBuffer(Size);
            for(var i = 0; i < arrTr.length; i++)
            {
                BufWrite.Write(arrTr[i], "uint")
            }
            var written = fs.writeSync(FD, BufWrite, 0, BufWrite.length, Position);
            if(written !== BufWrite.length)
            {
                TO_ERROR_LOG("DB", 242, "Error write to file block-chain : " + written + " <> " + BufWrite.length)
                return false;
            }
        }
        return true;
    }
    WriteBodyDB(Block)
    {
        var FileItem = BlockDB.OpenDBFile(FILE_NAME_BODY, 1);
        var FD = FileItem.fd;
        var Position = FileItem.size;
        Block.TrDataPos = Position
        var arrTr = Block.arrContent;
        if(!arrTr || arrTr.length === 0)
        {
            Block.TrCount = 0
            Block.TrDataLen = 0
            return true;
        }
        var TrDataLen = 4;
        var arrSize = [];
        for(var i = 0; i < arrTr.length; i++)
        {
            var body = arrTr[i];
            arrSize[i] = 2 + body.length
            TrDataLen += arrSize[i]
        }
        Block.VersionBody = 1
        TrDataLen += arrTr.length * 6
        var BufWrite = BufLib.GetNewBuffer(TrDataLen);
        BufWrite.Write(arrTr.length, "uint16")
        BufWrite.Write(Block.VersionBody, "uint16")
        for(var i = 0; i < arrTr.length; i++)
        {
            var body = arrTr[i];
            BufWrite.Write(body, "tr")
        }
        var written = fs.writeSync(FD, BufWrite, 0, BufWrite.length, Position);
        if(written !== BufWrite.length)
        {
            TO_ERROR_LOG("DB", 240, "Error write to file block-chain : " + written + " <> " + BufWrite.length)
            return false;
        }
        FileItem.size += TrDataLen
        Block.TrCount = arrTr.length
        Block.TrDataLen = TrDataLen
        return true;
    }
    WriteBlockHeaderDB(Block, bPreSave)
    {
        if(!bPreSave && Block.BlockNum > this.BlockNumDBMin + BLOCK_PROCESSING_LENGTH2)
        {
            if(USE_CHECK_SAVE_DB)
                if(!this.CheckSeqHashDB(Block, "WriteBlockHeaderDB"))
                    return false;
            this.WriteBlockHeader100(Block)
            this.TruncateBlockDBInner(Block)
            this.BlockNumDB = Block.BlockNum - 1
            var PrevBlock = this.ReadBlockHeaderDB(Block.BlockNum - 1);
            if(!PrevBlock)
            {
                ToLogTrace("Cant write header block:" + Block.BlockNum + "  prev block not found")
                throw "ERR: PREV BLOCK NOT FOUND";
                return false;
            }
            Block.SumHash = shaarr2(PrevBlock.SumHash, Block.Hash)
            Block.SumPow = PrevBlock.SumPow + GetPowPower(Block.PowHash)
        }
        if(global.DB_VERSION === 2)
        {
            return this.WriteBlockHeaderToFile2(Block);
        }
        var BufWrite = BufLib.GetNewBuffer(BLOCK_HEADER_SIZE);
        this.BlockHeaderToBuf(BufWrite, Block)
        var Res = this.WriteBufHeaderToFile1(BufWrite, Block.BlockNum);
        return Res;
    }
    WriteBlockHeaderToFile2(Block)
    {
        var BufWrite, FileItem, written;
        var BlockNum = Math.trunc(Block.BlockNum);
        this.TruncateBufMap(BlockNum)
        Block.VersionDB = global.DB_VERSION
        BufWrite = BufLib.GetBufferFromObject(Block, FORMAT_STREAM_HEADER, 200, WorkStructStreamHeader)
        FileItem = BlockDB.OpenDBFile(FILE_NAME_BODY, 1)
        if(!Block.FilePos)
        {
            if(!FileItem.size)
                FileItem.size = 100
            Block.FilePos = FileItem.size
        }
        written = fs.writeSync(FileItem.fd, BufWrite, 0, BufWrite.length, Block.FilePos)
        if(written !== BufWrite.length)
        {
            TO_ERROR_LOG("DB", 242, "Error write to file block-chain : " + written + " <> " + BufWrite.length)
            return false;
        }
        if(Block.FilePos >= FileItem.size)
        {
            FileItem.size = Block.FilePos + BufWrite.length
        }
        FileItem = BlockDB.OpenDBFile(FILE_NAME_HEADER2, 1)
        var Position = BlockNum * BLOCK_HEADER_SIZE2;
        BufWrite = BufLib.GetBufferFromObject(Block, FORMAT_HEADER_VERSION2, BLOCK_HEADER_SIZE2, WorkStructHeader2)
        written = fs.writeSync(FileItem.fd, BufWrite, 0, BufWrite.length, Position)
        if(Position >= FileItem.size)
        {
            FileItem.size = Position + BufWrite.length
        }
        if(written !== BufWrite.length)
        {
            TO_ERROR_LOG("DB", 262, "Error write to file block-header :" + written + " <> " + BufWrite.length)
            return false;
        }
        else
        {
            return true;
        }
    }
    WriteBufHeaderToFile1(BufWrite, BlockNum)
    {
        BlockNum = Math.trunc(BlockNum)
        this.TruncateBufMap(BlockNum)
        var FileItem = BlockDB.OpenDBFile(FILE_NAME_HEADER, 1);
        var Position = BlockNum * BLOCK_HEADER_SIZE;
        var written = fs.writeSync(FileItem.fd, BufWrite, 0, BufWrite.length, Position);
        if(Position >= FileItem.size)
        {
            FileItem.size = Position + BufWrite.length
        }
        if(written !== BufWrite.length)
        {
            TO_ERROR_LOG("DB", 260, "Error write to file block-header :" + written + " <> " + BufWrite.length)
            return false;
        }
        else
        {
            return true;
        }
    }
    WriteBlockHeader100(Block)
    {
        return ;
        if(Block.BlockNum % 100 !== 0)
            return ;
        var Hash100;
        var Num = Block.BlockNum / 100;
        if(Num <= 0)
        {
            Hash100 = []
        }
        else
        {
            var PrevHash100 = [];
            var PrevData = this.DBHeader100.Read(Num - 1);
            if(PrevData)
            {
                PrevHash100 = PrevData.Hash100
            }
            else
                if(Num > 1)
                {
                    ToLog("NOT FIND PEVHASH100   BlockNum=" + Block.BlockNum, 2)
                    return ;
                }
            Hash100 = sha3arr2(PrevHash100, Block.Hash)
        }
        this.DBHeader100.Write({Num:Num, Hash100:Hash100, Hash:Block.Hash})
    }
    TruncateBlockDBInner100(LastBlock)
    {
        return ;
        this.DBHeader100.Truncate(Math.trunc(LastBlock.BlockNum / 100))
    }
    ReadBlockDB(Num)
    {
        if(!Num)
            Num = 0
        Num = Math.trunc(Num)
        var Block = this.ReadBlockHeaderDB(Num);
        if(Block && Block.TrDataLen)
        {
            var Ret = this.ReadBlockBodyDB(Block);
            if(!Ret)
                return undefined;
        }
        else
        {
            if(Block && !IsZeroArr(Block.TreeHash))
            {
                ToLogTrace("ERROR arrContent on BlockNum=" + Num)
                return undefined;
            }
        }
        return Block;
    }
    ReadBlockBodyDB(Block)
    {
        var FileItem = BlockDB.OpenDBFile(FILE_NAME_BODY);
        if(Block.TrDataLen > MAX_BLOCK_SIZE * 2)
        {
            ToLogTrace("Error value TrDataLen, BlockNum=" + Block.BlockNum)
            return false;
        }
        var Position = Block.TrDataPos;
        var BufRead = BufLib.GetNewBuffer(Block.TrDataLen);
        var bytesRead = fs.readSync(FileItem.fd, BufRead, 0, BufRead.length, Position);
        if(bytesRead !== BufRead.length)
        {
            TO_ERROR_LOG("DB", 272, "Error read block-body file: " + FileItem.name + "  from POS:" + Position + "  bytesRead=" + bytesRead + " of " + BufRead.length + "  BlockNum=" + Block.BlockNum)
            return false;
        }
        Block.arrContent = []
        Block.arrContentResult = []
        var TrCount = BufRead.Read("uint16");
        Block.VersionBody = BufRead.Read("uint16")
        if(TrCount <= MAX_TRANSACTION_COUNT)
        {
            for(var i = 0; i < TrCount; i++)
            {
                var body = BufRead.Read("tr");
                if(!body)
                    break;
                Block.arrContent[i] = body
            }
            if(Block.VersionBody === 1)
            {
                var Size = TrCount * 6;
                BufRead.len = Block.TrDataLen - Size
                for(var i = 0; i < TrCount; i++)
                {
                    Block.arrContentResult[i] = BufRead.Read("uint")
                }
            }
        }
        Block.TrCount = Block.arrContent.length
        return true;
    }
    ReadBlockHeaderDB(BlockNum)
    {
        if(global.DB_VERSION === 2)
        {
            return this.ReadBlockHeaderDB2(BlockNum);
        }
        if(BlockNum < 0)
        {
            return undefined;
        }
        BlockNum = Math.trunc(BlockNum)
        var Block, BufRead, FileItem, bytesRead, Position;
        BufRead = BufLib.GetNewBuffer(BLOCK_HEADER_SIZE)
        Position = BlockNum * BLOCK_HEADER_SIZE
        var FileItem = BlockDB.OpenDBFile(FILE_NAME_HEADER);
        bytesRead = fs.readSync(FileItem.fd, BufRead, 0, BufRead.length, Position)
        if(bytesRead !== BufRead.length)
            return undefined;
        Block = this.BufToBlockHeader(BufRead, BlockNum)
        if(Block)
        {
            Block.bSave = true
            Block.Prepared = true
        }
        return Block;
    }
    ReadBlockHeaderDB2(BlockNum)
    {
        var Block, BufRead, FileItem, bytesRead, Position;
        if(BlockNum < 0)
        {
            return undefined;
        }
        BlockNum = Math.trunc(BlockNum)
        Position = BlockNum * BLOCK_HEADER_SIZE2
        FileItem = BlockDB.OpenDBFile(FILE_NAME_HEADER2)
        BufRead = BufLib.GetNewBuffer(BLOCK_HEADER_SIZE2)
        bytesRead = fs.readSync(FileItem.fd, BufRead, 0, BufRead.length, Position)
        if(bytesRead !== BufRead.length)
            return undefined;
        Block = BufLib.GetObjectFromBuffer(BufRead, FORMAT_HEADER_VERSION2, WorkStructHeader2)
        if(!Block.FilePos)
        {
            return undefined;
        }
        Position = Block.FilePos
        FileItem = BlockDB.OpenDBFile(FILE_NAME_BODY)
        BufRead = BufLib.GetNewBuffer(200)
        bytesRead = fs.readSync(FileItem.fd, BufRead, 0, BufRead.length, Position)
        Block = BufLib.GetObjectFromBuffer(BufRead, FORMAT_STREAM_HEADER, WorkStructStreamHeader)
        if(Block.VersionDB !== global.DB_VERSION)
        {
            ToLog("ERROR VersionDB on Block: " + BlockNum)
            return undefined;
        }
        Block.FilePos = Position
        Block.VersionDB = global.DB_VERSION
        Block.bSave = true
        Block.Prepared = true
        return this.PrepareBlockFields(Block, BlockNum);
    }
    ClearBufMap()
    {
        this.MapHeader = {}
    }
    TruncateBufMap(BlockNum)
    {
        if(BlockNum % 10000 === 0)
            this.ClearBufMap()
        else
        {
            delete this.MapHeader[BlockNum]
        }
    }
    ReadBlockHeaderFromMapDB(BlockNum)
    {
        var Block = this.MapHeader[BlockNum];
        if(!Block)
        {
            Block = this.ReadBlockHeaderDB(BlockNum)
            this.MapHeader[BlockNum] = Block
        }
        else
        {
            Block.FromMap = 1
        }
        return Block;
    }
    SetTruncateBlockDB(BlockNum)
    {
        BlockNum = Math.trunc(BlockNum)
        if(BlockNum < BLOCK_PROCESSING_LENGTH2)
            BlockNum = BLOCK_PROCESSING_LENGTH2
        if(this.UseTruncateBlockDB)
        {
            if(BlockNum < this.UseTruncateBlockDB)
                this.UseTruncateBlockDB = BlockNum
        }
        else
        {
            this.UseTruncateBlockDB = BlockNum
        }
    }
    TruncateBlockDB(LastBlockNum)
    {
        this.UseTruncateBlockDB = undefined
        var Block = this.ReadBlockDB(LastBlockNum);
        if(!Block)
        {
            ToLog("************ ERROR TruncateBlockDB - not found block=" + LastBlockNum, 2)
            return ;
        }
        this.WriteBlockDB(Block)
    }
    TruncateBlockDBInner(LastBlock)
    {
        var FItem1, size;
        if(global.DB_VERSION === 2)
        {
            FItem1 = BlockDB.OpenDBFile(FILE_NAME_HEADER2, 1)
            size = (LastBlock.BlockNum + 1) * BLOCK_HEADER_SIZE2
        }
        else
        {
            FItem1 = BlockDB.OpenDBFile(FILE_NAME_HEADER, 1)
            size = (LastBlock.BlockNum + 1) * BLOCK_HEADER_SIZE
        }
        if(size < 0)
            size = 0
        if(FItem1.size > size)
        {
            FItem1.size = size
            fs.ftruncateSync(FItem1.fd, FItem1.size)
        }
        this.TruncateStat(LastBlock.BlockNum)
        this.TruncateBlockDBInner100(LastBlock)
    }
    ClearDataBase()
    {
        if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
            global.TX_PROCESS.RunRPC("ClearDataBase", {})
        var FItem1 = BlockDB.OpenDBFile(FILE_NAME_HEADER, 1);
        FItem1.size = 0
        fs.ftruncateSync(FItem1.fd, FItem1.size)
        var FItem12 = BlockDB.OpenDBFile(FILE_NAME_HEADER2, 1);
        FItem12.size = 0
        fs.ftruncateSync(FItem12.fd, FItem12.size)
        var FItem2 = BlockDB.OpenDBFile(FILE_NAME_BODY, 1);
        FItem2.size = 0
        fs.ftruncateSync(FItem2.fd, FItem2.size)
        this.DBHeader100.Truncate( - 1)
        global.DB_VERSION = DEFAULT_DB_VERSION
        this.BlockNumDB = 0
        this.BlockNumDBMin = 0
        this.ClearBufMap()
        this.ClearStat()
        this.CreateGenesisBlocks()
        this.StartSyncBlockchain()
    }
    Close()
    {
        this.ClearBufMap()
        this.ReadStateTX()
        BlockDB.CloseDBFile(FILE_NAME_HEADER)
        BlockDB.CloseDBFile(FILE_NAME_HEADER2)
        BlockDB.CloseDBFile(FILE_NAME_BODY)
        this.DBHeader100.Close()
    }
    RewriteAllTransactions()
    {
        if(TX_PROCESS.Worker)
        {
            if(global.TX_PROCESS && global.TX_PROCESS.RunRPC)
            {
                global.TX_PROCESS.RunRPC("RewriteAllTransactions", {})
                return 1;
            }
        }
        return 0;
    }
    BlockHeaderToBuf(BufWrite, Block)
    {
        Block.Reserv500 = 0
        var len = BufWrite.len;
        BufWrite.Write(Block.TreeHash, "hash")
        BufWrite.Write(Block.AddrHash, "hash")
        BufWrite.Write(Block.PrevHash, "hash")
        BufWrite.Write(Block.SumHash, "hash")
        BufWrite.Write(Block.SumPow, "uint")
        BufWrite.Write(Block.Reserv500, "uint")
        BufWrite.Write(Block.TrDataPos, "uint")
        BufWrite.Write(Block.TrDataLen, "uint32")
        BufWrite.len = len + BLOCK_HEADER_SIZE
    }
    BufToBlockHeader(BufRead, Num)
    {
        var Block = {};
        var len = BufRead.len;
        Block.TreeHash = BufRead.Read("hash")
        Block.AddrHash = BufRead.Read("hash")
        Block.PrevHash = BufRead.Read("hash")
        Block.SumHash = BufRead.Read("hash")
        Block.SumPow = BufRead.Read("uint")
        Block.Reserv500 = BufRead.Read("uint")
        Block.TrDataPos = BufRead.Read("uint")
        Block.TrDataLen = BufRead.Read("uint32")
        Block.TrCount = 0
        BufRead.len = len + BLOCK_HEADER_SIZE
        return this.PrepareBlockFields(Block, Num);
    }
    PrepareBlockFields(Block, Num)
    {
        Block.AddInfo = AddInfoBlock.bind(Block)
        Block.Info = ""
        Block.BlockNum = Num
        Block.SeqHash = this.GetSeqHash(Block.BlockNum, Block.PrevHash, Block.TreeHash)
        if(Block.BlockNum >= BLOCK_GENESIS_COUNT)
        {
            CalcHashBlockFromSeqAddr(Block)
        }
        else
        {
            Block.Hash = this.GetHashGenesis(Block.BlockNum)
            Block.PowHash = Block.Hash
        }
        Block.Power = GetPowPower(Block.PowHash)
        if(IsZeroArr(Block.Hash))
            return undefined;
        return Block;
    }
    GetRows(start, count, Filter, bMinerName)
    {
        if(Filter)
        {
            Filter = Filter.trim()
            Filter = Filter.toUpperCase()
        }
        var MaxAccount = DApps.Accounts.GetMaxAccount();
        var WasError = 0;
        var arr = [];
        for(var num = start; true; num++)
        {
            var Block = this.ReadBlockHeaderDB(num);
            if(!Block)
                break;
            Block.Num = Block.BlockNum
            if(Block.AddrHash)
            {
                Block.Miner = ReadUintFromArr(Block.AddrHash, 0)
                if(Block.BlockNum < 16 || Block.Miner > MaxAccount)
                    Block.Miner = 0
                if(bMinerName)
                {
                    Block.MinerName = ""
                    if(Block.Miner)
                    {
                        var Item = DApps.Accounts.ReadState(Block.Miner);
                        if(Item && Item.Name)
                            Block.MinerName = Item.Name.substr(0, 8)
                    }
                }
                var Value = GetHashFromSeqAddr(Block.SeqHash, Block.AddrHash, Block.BlockNum, Block.PrevHash);
                Block.Hash1 = Value.Hash1
                Block.Hash2 = Value.Hash2
            }
            if(Filter)
            {
                var Num = Block.BlockNum;
                var Bytes = Block.TrDataLen;
                var Pow = Block.Power;
                var Miner = Block.Miner;
                var Date = DateFromBlock(Block.BlockNum);
                try
                {
                    if(!eval(Filter))
                        continue;
                }
                catch(e)
                {
                    if(!WasError)
                        ToLog(e)
                    WasError = 1
                }
            }
            arr.push(Block)
            count--
            if(count < 1)
                break;
        }
        return arr;
    }
    GetTrRows(BlockNum, start, count)
    {
        var arr = [];
        var Block = this.ReadBlockDB(BlockNum);
        if(Block && Block.arrContent)
            for(var num = start; num < start + count; num++)
            {
                if(num < 0)
                    continue;
                if(num >= Block.arrContent.length)
                    break;
                var Tr = {body:Block.arrContent[num]};
                this.CheckCreateTransactionObject(Tr, 1)
                Tr.Num = num
                Tr.Type = Tr.body[0]
                Tr.Length = Tr.body.length
                Tr.Body = []
                for(var j = 0; j < Tr.body.length; j++)
                    Tr.Body[j] = Tr.body[j]
                var App = DAppByType[Tr.Type];
                if(App)
                {
                    Tr.Script = App.GetScriptTransaction(Tr.body)
                    if(BlockNum >= this.BlockNumDBMin)
                        Tr.Verify = App.GetVerifyTransaction(Block, BlockNum, Tr.Num, Tr.body)
                    else
                        Tr.Verify = 0
                    if(Tr.Verify >= 1)
                    {
                        Tr.VerifyHTML = "<B style='color:green'>✔</B>"
                        if(Tr.Verify > 1)
                        {
                            Tr.VerifyHTML += "(" + Tr.Verify + ")"
                        }
                    }
                    else
                        if(Tr.Verify ==  - 1)
                            Tr.VerifyHTML = "<B style='color:red'>✘</B>"
                        else
                            Tr.VerifyHTML = ""
                }
                else
                {
                    Tr.Script = ""
                    Tr.VerifyHTML = ""
                }
                arr.push(Tr)
            }
        return arr;
    }
    ClearStat()
    {
        var MAX_ARR_PERIOD = MAX_STAT_PERIOD * 2 + 10;
        this.StatMap = {StartPos:0, StartBlockNum:0, Length:0, "ArrPower":new Float64Array(MAX_ARR_PERIOD), "ArrPowerMy":new Float64Array(MAX_ARR_PERIOD),
        }
    }
    TruncateStat(LastBlockNum)
    {
        if(this.StatMap)
        {
            var LastNumStat = this.StatMap.StartBlockNum + this.StatMap.Length;
            var Delta = LastNumStat - LastBlockNum;
            if(Delta > 0)
            {
                this.StatMap.Length -= Delta
                if(this.StatMap.Length < 0)
                    this.StatMap.Length = 0
            }
            this.StatMap.CaclBlockNum = 0
        }
    }
    GetStatBlockchainPeriod(Param)
    {
        var StartNum = Param.BlockNum;
        if(!Param.Count || Param.Count < 0)
            Param.Count = 1000
        if(!Param.Miner)
            Param.Miner = 0
        if(!Param.Adviser)
            Param.Adviser = 0
        var Map = {};
        var ArrList = new Array(Param.Count);
        var i = 0;
        for(var num = StartNum; num < StartNum + Param.Count; num++)
        {
            var Power = 0, PowerMy = 0, Nonce = 0;
            if(num <= this.BlockNumDB)
            {
                var Block = this.ReadBlockHeaderDB(num);
                if(Block)
                {
                    Power = GetPowPower(Block.PowHash)
                    var Miner = ReadUintFromArr(Block.AddrHash, 0);
                    var Nonce = ReadUintFromArr(Block.AddrHash, 6);
                    if(Param.Miner < 0)
                    {
                        if(Param.Adviser)
                        {
                            var Adviser = DApps.Accounts.GetAdviserByMiner(Map, Miner);
                            if(Adviser === Param.Adviser)
                                PowerMy = Power
                        }
                        else
                        {
                            PowerMy = Power
                        }
                    }
                    else
                        if(Miner === Param.Miner && !Param.bMinerLess)
                        {
                            PowerMy = Power
                        }
                        else
                            if(Miner <= Param.Miner && Param.bMinerLess)
                            {
                                PowerMy = Power
                            }
                }
            }
            ArrList[i] = PowerMy
            if(Param.bNonce && PowerMy)
                ArrList[i] = Nonce
            i++
        }
        var AvgValue = 0;
        for(var j = 0; j < ArrList.length; j++)
        {
            if(ArrList[j])
                AvgValue += ArrList[j]
        }
        if(ArrList.length > 0)
            AvgValue = AvgValue / ArrList.length
        const MaxSizeArr = 1000;
        var StepTime = 1;
        while(ArrList.length >= MaxSizeArr)
        {
            if(Param.bNonce)
                ArrList = ResizeArrMax(ArrList)
            else
                ArrList = ResizeArrAvg(ArrList)
            StepTime = StepTime * 2
        }
        return {ArrList:ArrList, AvgValue:AvgValue, steptime:StepTime};
    }
    GetStatBlockchain(name, MinLength)
    {
        if(!MinLength)
            return [];
        var MAX_ARR_PERIOD = MAX_STAT_PERIOD * 2 + 10;
        if(!this.StatMap)
        {
            this.ClearStat()
        }
        var MaxNumBlockDB = this.GetMaxNumBlockDB();
        if(this.StatMap.CaclBlockNum !== MaxNumBlockDB || this.StatMap.CalcMinLength !== MinLength)
        {
            this.StatMap.CaclBlockNum = MaxNumBlockDB
            this.StatMap.CalcMinLength = MinLength
            var start = MaxNumBlockDB - MinLength + 1;
            var finish = MaxNumBlockDB + 1;
            var StartPos = this.StatMap.StartPos;
            var ArrPower = this.StatMap.ArrPower;
            var ArrPowerMy = this.StatMap.ArrPowerMy;
            var StartNumStat = this.StatMap.StartBlockNum;
            var FinishNumStat = this.StatMap.StartBlockNum + this.StatMap.Length - 1;
            var CountReadDB = 0;
            var arr = new Array(MinLength);
            var arrmy = new Array(MinLength);
            for(var num = start; num < finish; num++)
            {
                var i = num - start;
                var i2 = (StartPos + i) % MAX_ARR_PERIOD;
                if(num >= StartNumStat && num <= FinishNumStat && (num < finish - 10))
                {
                    arr[i] = ArrPower[i2]
                    arrmy[i] = ArrPowerMy[i2]
                }
                else
                {
                    CountReadDB++
                    var Power = 0, PowerMy = 0;
                    if(num <= MaxNumBlockDB)
                    {
                        var Block = this.ReadBlockHeaderDB(num);
                        if(Block)
                        {
                            Power = GetPowPower(Block.PowHash)
                            var Miner = ReadUintFromArr(Block.AddrHash, 0);
                            if(Miner === GENERATE_BLOCK_ACCOUNT)
                            {
                                PowerMy = Power
                            }
                        }
                    }
                    arr[i] = Power
                    arrmy[i] = PowerMy
                    ArrPower[i2] = arr[i]
                    ArrPowerMy[i2] = arrmy[i]
                    if(num > FinishNumStat)
                    {
                        this.StatMap.StartBlockNum = num - this.StatMap.Length
                        this.StatMap.Length++
                        if(this.StatMap.Length > MAX_ARR_PERIOD)
                        {
                            this.StatMap.Length = MAX_ARR_PERIOD
                            this.StatMap.StartBlockNum++
                            this.StatMap.StartPos++
                        }
                    }
                }
            }
            this.StatMap["POWER_BLOCKCHAIN"] = arr
            this.StatMap["POWER_MY_WIN"] = arrmy
        }
        var arr = this.StatMap[name];
        if(!arr)
            arr = []
        var arrT = this.StatMap["POWER_BLOCKCHAIN"];
        for(var i = 0; i < arrT.length; i++)
            if(!arrT[i])
            {
                this.StatMap = undefined
                break;
            }
        return arr;
    }
    GetHashGenesis(Num)
    {
        return [Num + 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, Num + 1];
    }
    GetSeqHash(BlockNum, PrevHash, TreeHash)
    {
        var arr = [GetArrFromValue(BlockNum), PrevHash, TreeHash];
        var SeqHash = CalcHashFromArray(arr, true);
        return SeqHash;
    }
    CheckCreateTicketObject(Tr, BlockNum, SetTxID)
    {
        if(!Tr.HashPow && Tr.HashTicket)
        {
            Tr.num = BlockNum
            var FullHashTicket = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for(var i = 0; i < global.TX_TICKET_HASH_LENGTH; i++)
                FullHashTicket[i] = Tr.HashTicket[i]
            WriteUintToArrOnPos(FullHashTicket, Tr.num, global.TX_TICKET_HASH_LENGTH)
            Tr.HashPow = sha3(FullHashTicket)
            Tr.power = GetPowPower(Tr.HashPow)
            Tr.TimePow = Tr.power
            if(SetTxID)
                Tr.TxID = GetHexFromArr(FullHashTicket.slice(0, TX_TICKET_HASH_LENGTH + 6))
        }
    }
    CheckCreateTransactionObject(Tr, SetTxID)
    {
        if(!Tr.HashPow)
        {
            var Body = Tr.body;
            Tr.IsTx = 1
            Tr.num = ReadUintFromArr(Body, Body.length - 12)
            if(Tr.num >= global.BLOCKNUM_TICKET_ALGO)
                Tr.HASH = sha3(Body)
            else
                Tr.HASH = shaarr(Body)
            Tr.HashTicket = Tr.HASH.slice(0, global.TX_TICKET_HASH_LENGTH)
            this.CheckCreateTicketObject(Tr, Tr.num, SetTxID)
        }
    }
    BlockChainToBuf(WriteNum, StartNum, EndBlockNum)
    {
        if(StartNum === undefined)
            return BufLib.GetNewBuffer(10);
        var GetLength = EndBlockNum - StartNum + 1;
        var arr = [];
        var arr0 = this.PrevBlockChainArr;
        if(arr0 && arr0.length)
        {
            var Block = arr0[arr0.length - 1];
            if(Block.BlockNum >= StartNum && Block.BlockNum <= EndBlockNum)
            {
                var BlockDB = this.ReadBlockHeaderDB(Block.BlockNum);
                if(!BlockDB || CompareArr(Block.SumHash, BlockDB.SumHash) !== 0)
                {
                    arr0 = undefined
                }
                else
                {
                }
            }
        }
        var i0 = 0;
        for(var num = StartNum; num <= EndBlockNum; num++)
        {
            var Block = undefined;
            if(arr0)
            {
                for(var i = i0; i < arr0.length; i++)
                {
                    i0 = i
                    var Block0 = arr0[i];
                    if(Block0.BlockNum === num)
                    {
                        Block = Block0
                        break;
                    }
                }
            }
            if(!Block)
                Block = this.ReadBlockHeaderDB(num)
            if(!Block || !Block.Prepared || !Block.Hash)
                break;
            arr.push(Block)
        }
        this.PrevBlockChainArr = arr
        return this.ArrHeaderToBuf(WriteNum, arr);
    }
    ArrHeaderToBuf(StartNum, arr)
    {
        var CountSend = arr.length - BLOCK_PROCESSING_LENGTH2;
        var BufWrite;
        if(CountSend <= 0)
        {
            BufWrite = BufLib.GetNewBuffer(10)
        }
        else
        {
            var BufSize = 6 + 4 + BLOCK_PROCESSING_LENGTH2 * 32 + 32 + 6 + CountSend * 64;
            BufWrite = BufLib.GetNewBuffer(BufSize)
            BufWrite.Write(StartNum, "uint")
            BufWrite.Write(CountSend, "uint32")
            for(var i = 0; i < arr.length; i++)
            {
                var Block = arr[i];
                if(i < BLOCK_PROCESSING_LENGTH2)
                {
                    BufWrite.Write(Block.Hash, "hash")
                }
                else
                {
                    if(i === BLOCK_PROCESSING_LENGTH2)
                    {
                        BufWrite.Write(Block.SumHash, "hash")
                        BufWrite.Write(Block.SumPow, "uint")
                    }
                    BufWrite.Write(Block.TreeHash, "hash")
                    BufWrite.Write(Block.AddrHash, "hash")
                }
            }
        }
        return BufWrite;
    }
};
function AddInfo(Block,Str,BlockNumStart)
{
    if(!global.STAT_MODE)
        return ;
    if(!Block.Info)
        Block.Info = Str;
    else
        if(Block.Info.length < 2000)
        {
            var timesend = "" + SERVER.CurrentBlockNum - BlockNumStart;
            var now = GetCurrentTime();
            timesend += ".[" + now.getSeconds().toStringZ(2) + "." + now.getMilliseconds().toStringZ(3) + "]";
            Str = timesend + ": " + Str;
            Block.Info += "\n" + Str;
        }
}
global.AddInfoChain = function (Str)
{
    if(!global.STAT_MODE)
        return ;
    if(this.BlockNumStart > GetCurrentBlockNumByTime() - HISTORY_BLOCK_COUNT)
        AddInfo(this, Str, this.BlockNumStart);
}
global.AddInfoBlock = function (Block,Str)
{
    if(!global.STAT_MODE)
        return ;
    if(Block && Block.BlockNum && Block.BlockNum > GetCurrentBlockNumByTime() - HISTORY_BLOCK_COUNT)
        AddInfo(Block, Str, Block.BlockNum);
}
global.GetNodeStrPort = function (Node)
{
    if(!Node)
        return "";
    if(LOCAL_RUN)
        return "" + Node.port;
    else
    {
        if(!Node.ip)
            return "";
        var arr = Node.ip.split(".");
        return "" + arr[2] + "." + arr[3];
    }
}
