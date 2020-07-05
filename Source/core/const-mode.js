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

switch(global.MODE_RUN)
{
    case "LOCAL":
        global.NETWORK = "LOCAL";
        global.LOCAL_RUN = 1;
    case "FORK":
        
        if(global.FORK_MODE || global.LOCAL_RUN === 1)
            global.RESYNC_CONDITION = 0;
        global.REST_BLOCK_SCALE = 100;
        
        global.DELTA_BLOCK_ACCOUNT_HASH = 30;
        global.PERIOD_ACCOUNT_HASH = 10;
        global.START_BLOCK_ACCOUNT_HASH = 1;
        global.START_BLOCK_ACCOUNT_HASH3 = 1;
        
        global.SMART_BLOCKNUM_START = 0;
        global.START_MINING = 60;
        global.REF_PERIOD_END = 0;
        global.REF_PERIOD_MINING = 10;
        
        global.TEST_TRANSACTION_GENERATE = 0;
        global.MIN_POWER_POW_ACC_CREATE = 8;
        
        global.NEW_ACCOUNT_INCREMENT = 1;
        global.NEW_BLOCK_REWARD1 = 1;
        global.NEW_FORMULA_START = 1;
        global.NEW_FORMULA_KTERA = 3;
        global.NEW_FORMULA_TARGET1 = 0;
        global.NEW_FORMULA_TARGET2 = 1;
        
        global.ALL_VIEW_ROWS = 1;
        
        global.NEW_SIGN_TIME = 0;
        
        global.START_BAD_ACCOUNT_CONTROL = 0;
        global.BLOCKNUM_TICKET_ALGO = 0;
        global.MIN_POWER_POW_TR = 0;
        global.AUTO_CORRECT_TIME = 0;
        global.CHECK_GLOBAL_TIME = 0;
        
        global.UPDATE_CODE_1 = 0;
        global.UPDATE_CODE_2 = 0;
        global.UPDATE_CODE_3 = 0;
        global.UPDATE_CODE_4 = 0;
        global.UPDATE_CODE_5 = 0;
        global.UPDATE_CODE_6 = 0;
        global.EXPERIMENTAL_CODE = 0;
        
        global.REST_START_COUNT = 0;
        global.LOAD_TO_BEGIN = 0;
        break;
        
    case "TEST":
        global.TEST_NETWORK = 1;
        global.STANDART_PORT_NUMBER = 40000;
        
        global.REST_BLOCK_SCALE = 100;
        
        var Num = Date.now() - 50 * 1000;
        console.log("CURRENT NUM: " + (Math.trunc(Num / 1000) * 1000));
        
        global.SMART_BLOCKNUM_START = 0;
        global.START_NETWORK_DATE = 1582830189000;
        
        global.START_MINING = 100;
        global.REF_PERIOD_END = 0;
        global.REF_PERIOD_MINING = 200;
        global.MIN_POWER_POW_ACC_CREATE = 8;
        
        global.TRANSACTION_PROOF_COUNT = 200 * 1000;
        global.MAX_SIZE_LOG = 20 * 1024 * 1024;
        
        global.START_BLOCK_ACCOUNT_HASH = 1850000;
        global.START_BLOCK_ACCOUNT_HASH3 = 1;
        
        global.BLOCKNUM_TICKET_ALGO = 0;
        
        global.WALLET_NAME = "TEST";
        global.NETWORK = "TERA-TEST";
        
        global.ALL_VIEW_ROWS = 1;
        
        global.NEW_ACCOUNT_INCREMENT = 1;
        global.NEW_BLOCK_REWARD1 = 1;
        global.NEW_FORMULA_START = 1;
        global.NEW_FORMULA_KTERA = 3;
        global.NEW_FORMULA_TARGET1 = 0;
        global.NEW_FORMULA_TARGET2 = 1;
        
        global.NEW_SIGN_TIME = 1;
        
        global.MAX_LENGTH_SENDER_MAP = 100;
        global.DELTA_START_SENDER_MAP = 12;
        
        global.REST_START_COUNT = 10000;
        global.LOAD_TO_BEGIN = 2;
        global.START_BAD_ACCOUNT_CONTROL = 0;
        
        global.UPDATE_CODE_1 = 0;
        global.UPDATE_CODE_2 = 0;
        global.UPDATE_CODE_3 = 0;
        global.UPDATE_CODE_4 = 0;
        global.EXPERIMENTAL_CODE = 0;
        break;
        
    case "TEST_JINN":
        global.JINN_MODE = 1;
        global.NETWORK = "TEST-JINN";
        global.TEST_JINN = 1;
        
        global.START_NETWORK_DATE = 1593818071532;
        global.CONSENSUS_PERIOD_TIME = 3000;
        
        global.RESYNC_CONDITION = 0;
        global.REST_BLOCK_SCALE = 100;
        global.DELTA_BLOCK_ACCOUNT_HASH = 30;
        global.PERIOD_ACCOUNT_HASH = 10;
        global.START_BLOCK_ACCOUNT_HASH = 0;
        global.START_BLOCK_ACCOUNT_HASH3 = 1;
        
        global.SMART_BLOCKNUM_START = 0;
        global.START_MINING = 30;
        global.REF_PERIOD_END = 0;
        global.REF_PERIOD_MINING = 10;
        
        global.TEST_TRANSACTION_GENERATE = 0;
        global.MIN_POWER_POW_ACC_CREATE = 8;
        
        global.NEW_ACCOUNT_INCREMENT = 1;
        global.NEW_BLOCK_REWARD1 = 1;
        global.NEW_FORMULA_START = 1;
        global.NEW_FORMULA_KTERA = 3 * 3;
        global.NEW_FORMULA_TARGET1 = 0;
        global.NEW_FORMULA_TARGET2 = 1;
        
        global.ALL_VIEW_ROWS = 0;
        
        global.NEW_SIGN_TIME = 0;
        
        global.START_BAD_ACCOUNT_CONTROL = 500000;
        global.BLOCKNUM_TICKET_ALGO = 0;
        global.MIN_POWER_POW_TR = 0;
        global.AUTO_CORRECT_TIME = 0;
        global.CHECK_GLOBAL_TIME = 0;
        
        global.UPDATE_CODE_JINN_HASH8 = 0;
        
        global.UPDATE_CODE_1 = 0;
        global.UPDATE_CODE_2 = 0;
        global.UPDATE_CODE_3 = 0;
        global.UPDATE_CODE_4 = 0;
        global.UPDATE_CODE_5 = 0;
        global.UPDATE_CODE_6 = 0;
        global.UPDATE_CODE_NEW_ACCHASH = 1;
        global.EXPERIMENTAL_CODE = 0;
        
        global.REST_START_COUNT = 0;
        global.LOAD_TO_BEGIN = 0;
        global.STAT_MODE = 1;
        
        global.UPDATE_CODE_JINN_SUMHASH = 0;
        
        break;
        
    case "LOCAL_JINN":
        global.NETWORK = "LOCAL-JINN";
        global.LOCAL_RUN = 1;
        global.JINN_MODE = 1;
        global.TEST_JINN = 1;
        
        global.CONSENSUS_PERIOD_TIME = 3000;
        
        global.RESYNC_CONDITION = 0;
        global.REST_BLOCK_SCALE = 100;
        
        global.DELTA_BLOCK_ACCOUNT_HASH = 30;
        global.PERIOD_ACCOUNT_HASH = 10;
        global.START_BLOCK_ACCOUNT_HASH = 1;
        global.START_BLOCK_ACCOUNT_HASH3 = 1;
        
        global.SMART_BLOCKNUM_START = 0;
        global.START_MINING = 60;
        global.REF_PERIOD_END = 0;
        global.REF_PERIOD_MINING = 10;
        
        global.TEST_TRANSACTION_GENERATE = 0;
        global.MIN_POWER_POW_ACC_CREATE = 8;
        
        global.NEW_ACCOUNT_INCREMENT = 1;
        global.NEW_BLOCK_REWARD1 = 1;
        global.NEW_FORMULA_START = 1;
        global.NEW_FORMULA_KTERA = 3;
        global.NEW_FORMULA_TARGET1 = 0;
        global.NEW_FORMULA_TARGET2 = 1;
        
        global.ALL_VIEW_ROWS = 1;
        
        global.NEW_SIGN_TIME = 0;
        
        global.START_BAD_ACCOUNT_CONTROL = 0;
        global.BLOCKNUM_TICKET_ALGO = 0;
        global.MIN_POWER_POW_TR = 0;
        global.AUTO_CORRECT_TIME = 0;
        global.CHECK_GLOBAL_TIME = 0;
        
        global.UPDATE_CODE_1 = 0;
        global.UPDATE_CODE_2 = 0;
        global.UPDATE_CODE_3 = 0;
        global.UPDATE_CODE_4 = 0;
        global.UPDATE_CODE_5 = 0;
        global.UPDATE_CODE_6 = 0;
        global.EXPERIMENTAL_CODE = 0;
        
        global.REST_START_COUNT = 0;
        global.LOAD_TO_BEGIN = 0;
        
        global.UPDATE_CODE_JINN_HASH8 = 1641;
        global.UPDATE_CODE_JINN_SUMHASH = global.UPDATE_CODE_JINN_HASH8;
        global.UPDATE_CODE_JINN_KTERA = global.UPDATE_CODE_JINN_HASH8;
        global.NEW_FORMULA_JINN_KTERA = 3 * 3;
        
        break;
        
    case "MAIN":
    case "MAIN_JINN":
        global.NETWORK = "MAIN-JINN";
        var NewStartNum = 63510000;
        global.UPDATE_CODE_JINN_HASH8 = NewStartNum;
        global.UPDATE_CODE_JINN_SUMHASH = NewStartNum;
        global.UPDATE_CODE_JINN_KTERA = NewStartNum;
        global.UPDATE_CODE_6 = NewStartNum;
        global.NEW_FORMULA_JINN_KTERA = 3 * 3;
        
        global.CONSENSUS_PERIOD_TIME = 3000;
        var StartSec = 1530446400;
        global.START_NETWORK_DATE = 1000 * (StartSec - NewStartNum * 2);
        break;
        
    default:
}
