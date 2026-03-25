import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {

  databaseURL: "https://play-match-9edac-default-rtdb.firebaseio.com",
};

// 初始化 Firebase 应用
const appIn = initializeApp(firebaseConfig);

// 获取 Realtime Database 服务实例
const databaseIn = getDatabase(appIn);
   
// 导出 database 实例
export { databaseIn };
