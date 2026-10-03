# 吃什麼

手機優先、零付費 API、零套件依賴的附近餐廳轉盤。

## 開啟

已安裝 Node.js 18 以上時：

    npm start

電腦瀏覽器開啟 http://localhost:4173 。也可使用其他靜態網頁伺服器。
直接雙擊 index.html 的 file:// 方式無法可靠載入 JavaScript 模組，請使用伺服器。

## 手機免費上線

此專案可放在 GitHub Pages，無須付費後端或 API 金鑰。GitHub Free 的公開儲存庫可使用 Pages。

1. 將此資料夾的檔案推送至自己的 GitHub 公開儲存庫。
2. 在 Settings → Pages → Build and deployment 選擇 Deploy from a branch。
3. 選擇目前放置檔案的分支及 /(root)，儲存。
4. 等待完成後，在手機開啟 GitHub 顯示的 HTTPS 網址。
5. iPhone 可用 Safari「分享 → 加入主畫面」，Android 可用瀏覽器選單加入主畫面。

所有資源使用相對網址，支援 https://帳號.github.io/儲存庫/ 子目錄。
局域網 HTTP 連線可試畫面與手動座標，但手機 GPS 通常需要 HTTPS。
正式網址：https://z12312355-arch.github.io/Eat/ 。啟用 Pages 並完成部署後即可在手機開啟。

## 功能

- 手機 GPS 定位、手動座標及台北／台中／高雄車站地標。
- 300 公尺～5 公里直線半徑；餐廳、速食／小吃、咖啡／輕食篩選。
- 勾選候選、店名／料理搜尋、手動口袋名單。
- Web Crypto 公平抽籤、對應結果的轉盤動畫、略過動畫與減少動態偏好。
- 換一家排除剛抽中的店；Google Maps 查看／步行導航。
- 最近 7 天吃過排除、永久排除與恢復、本機紀錄刪除。
- 明確標示的試玩模式。範例不提供導航、不寫入吃過紀錄。
- Service Worker 保存網站程式；首次載入後離線仍可使用手動名單。

## 資料與限制

附近搜尋使用 OpenStreetMap 社群資料與公共 Overpass API，不是 Google 餐廳搜尋。
OpenStreetMap 店家收錄不完整，尤其部分地區的小吃。不能提供 Google 評分、價格或可靠的即時營業篩選。
營業時間僅顯示原始資料，不將未知狀態當作營業中。Google Maps 連結讓使用者確認營業資訊。
手動候選不受距離或種類限制，介面會標示距離未提供。
搜尋結果顯示直線距離，不是步行路線距離。

公共 Overpass 屬共享、盡力服務，可能忙碌、限流或暫停。適用個人低頻使用的原型，不保證可承載公開大量流量。
只在使用者按下搜尋時請求；查詢間隔至少 15 秒，相同位置／半徑的結果在記憶體重用 5 分鐘，不自動重試。
查詢逾時 35 秒，錯誤時可使用手動候選。若日後大量使用，需重新評估資料來源與公共服務政策。
來源與授權：https://www.openstreetmap.org/copyright
公共服務政策：https://dev.overpass-api.de/overpass-doc/en/preface/commons.html

## 隱私

搜尋中心座標與 IP 會傳送至公共 Overpass 服務；Google Maps 在使用者點擊連結後開啟。
沒有帳號、分析追蹤、第三方字型或後端資料庫。
座標及附近搜尋結果不寫入 localStorage。手動名單、吃過紀錄（店家 ID／名稱／時間）與黑名單保存在本機，可逐筆刪除。
清除瀏覽器網站資料會移除紀錄。離線無法查詢附近餐廳。
資料服務隱私政策：https://osmfoundation.org/wiki/Privacy_Policy

## 驗證

    npm test
    npm run check

使用 Node 內建測試框架，檢查距離、資料去重、篩選、亂數拒絕取樣、轉盤落點及導航 URL。

搜尋超過 12 家時預設勾選最近 12 家，並保留完整名單。全選可讓全部候選參與抽籤；超過 40 家時轉盤省略文字，以色塊呈現，抽籤機率不變。瀏覽器回歸測試位於 tools/browser-check.cjs，需要開發環境另有 Playwright；網站本身無套件依賴。

