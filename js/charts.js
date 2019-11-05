(function (root,create){
    root.charts = create(root);
})("undefined" !==typeof window?window:this,function (root) {
    var final={};
    function createNode(name,options) {
      options=options?options:{};
      var svgNS="http://www.w3.org/2000/svg";
      var newNode = document.createElementNS(svgNS, name);
      for(var item in options){
        newNode.setAttribute(item,options[item]);
      }
      return newNode;
    }

    function init(outDiv){
      var _this = this;
      if(!this.hasOwnProperty("defaultOptions")){
        var svgWidth,svgHeight;
        var xTitleHeight = 30;
        var yTitleWidth = 30;
        var totalTitleWidth = 50;
        //获取svg标签高度
        var svgWidthString = _this.nodeSvg.width.animVal.valueAsString;
        var svgHeightString = _this.nodeSvg.height.animVal.valueAsString;
        svgWidth = /^(\d+)*\.*\d+%$/.test(svgWidthString)?outDiv.clientWidth * parseFloat(svgWidthString)/100:isNaN(parseFloat(svgWidthString))?outDiv.clientWidth:parseFloat(svgWidthString);
        svgHeight = /^(\d+)*\.*\d+%$/.test(svgHeightString)?outDiv.clientHeight * parseFloat(svgHeightString)/100:isNaN(parseFloat(svgHeightString))?outDiv.clientHeight:parseFloat(svgHeightString);
        //svg标签高度获取完成

        //定义初始默认设置
        this.defaultOptions = {
          type:"live-data",
          chartType:"line",
          src:null,
          pollingTime:1000,
          xTitle:"",
          yTitle:"",
          xCalibration:[],          //x坐标刻度集合
          xAxisLength:"auto",       //x轴长度
          xTitleHeight,
          startPointX:yTitleWidth,
          startPointY:svgHeight-xTitleHeight,
          svgWidth,
          svgHeight:svgHeight-totalTitleWidth-xTitleHeight,
          yAxisCount:4,
          yAxisStyle:"stroke:#e6e6e6;stroke-width:1",
          pathStyle:"stroke:rgb(48,143,180);stroke-width:2"
        };
      }
      if(!this.hasOwnProperty("varState")){
        this.varState = {
          path:false,
          yAxis:false
        }
      }
      if(!this.hasOwnProperty("dataScope")){
        this.dataScope = {
          dataValue:[]
        }
      }
      if(!this.hasOwnProperty("dataSource")){
        var value;
        Object.defineProperty(this,"dataSource",{
          get(){
            return value;
          },
          set(newValue){
            value = newValue;
            showChart.call(this);
          },
          enumerable:false,
          configurable:false
        })
      }
    };

    function createYaxis(nodeParent,typeCharts){
      //获取最大值，最小值，设置默认变量style（包含颜色，宽度等），varState中的y轴已创建变量，间距及数量变量
      function lineAttr(options,max,min) {
        var result = [],
            startX = options.startPointX,
            lineLength = options.svgWidth - startX,
            style = options.yAxisStyle,
            count = options.yAxisCount,
            startY = options.startPointY,
            svgNextHeight = options.svgHeight/count;

        if(isNaN(count) || count<1)throw "yAxis count wrong";
        for(var i =0;i<=count;i++){
          var obj = {};
          obj.x1 = "" + startX;
          obj.y1 = "" + (startY - svgNextHeight*i);
          obj.x2 = "" + lineLength;
          obj.y2 = obj.y1;
          obj.style = style;
          result.push(obj);
        }
        //...根据max和min放刻度
        return result;
      }
      if(typeCharts === "line"){
        var varState = this.varState;
        if(!varState.yAxis){
          var options = this.defaultOptions,
            dataScope = this.dataScope,
            max = dataScope.max,
            min = dataScope.min;
          var lineArr = lineAttr(options,max,min);
          var nodeG = createNode("g",{class:"y_axis"});
          for(var i=0;i<lineArr.length;i++) {
            var nodeLine = createNode("line", lineArr[i]);
            nodeG.appendChild(nodeLine);
          }
          nodeParent.appendChild(nodeG);
          varState.yAxis = true;
        }
      }
    }

    function createPath(nodeParent,typeCharts){
      function shrink(max,min,totalMul,pathValue){
        var regM = new RegExp(/[, ] *-?(?:\d+\.)?\d+/),
            reg = new RegExp(/[, ] *-?(?:\d+\.)?\d+/g),
            multiple = (max -min)/options.svgHeight;
        totalMul = totalMul * multiple;
        max = max / multiple;
        min = min / multiple;
        var lIndex = pathValue.indexOf("l");
        var mPath = pathValue.substring(0, lIndex);
        var lPath = pathValue.substr(lIndex);
        mPath = mPath.replace(regM, function (mul, svgHeight) {
          return function (value) {
            return "," + ((svgHeight * (mul - 1) + value.match(/-?(?:\d+\.)?\d+/)[0] * 1) / mul).toFixed(1);
          }
        }(multiple, options.startPointY));
        lPath = lPath.replace(reg, function (mul) {
          return function (value) {
            return "," + (value.match(/-?(?:\d+\.)?\d+/)[0] / mul).toFixed(3) * 1;
          }
        }(multiple));//最终时测试此处闭包不会释放资源?(若不释放的话可否使用具名函数循环代替）
        pathValue = mPath + lPath;
        return [max,min,totalMul,pathValue];
      }
      if(typeCharts === "line"){
        var xCaState, //判断x轴长度是否指定
            path = this.varState.path,
            dataScope = this.dataScope,
            options = this.defaultOptions,
            count = 0,    //判断有效点个数
            nowData,
            min = {value:0,index:0},
            max = {value:0,index:0},
            pathValue = "",
            valueY,       //当前值
            preValueY,    //上一个值
            regM = new RegExp(/[, ] *-?(?:\d+\.)?\d+/),
            totalMul = 1, //总缩小倍数
            data = this.dataSource.split("\n"),
            title = data.shift().split(","),
            xCalibration = options.xCalibration,
            dataValue = dataScope.dataValue,
            firstValue = dataValue.length>1?dataValue[0]:0;
        var firstPointState = true;
        if(data[data.length-1]==="")data.pop();
        var length = data.length;
        var xAxisLength = options.xAxisLength==="auto"?length:options.xAxisLength;

        //x坐标集合初始化并保存是否用户输入x轴刻度状态
        xCalibration = Array.isArray(xCalibration)?xCalibration:[];
        if(!this.varState.hasOwnProperty("xCaState")){
          this.varState.xCaState = xCalibration.length>0;
        }     //保存用户是否传入指定x坐标轴刻度
        xCaState = this.varState.xCaState;

        //x轴长度未定，建议定默认长度
        var svgPathWidth = options.svgWidth-options.startPointX*2;
        var xSpacing = dataScope.hasOwnProperty("xSpacing")?dataScope.xSpacing:Math.floor(svgPathWidth / xAxisLength * 1000)/1000;

        //根据是否首次创建path初始化变量
        if(!path) {
          //获取x,y title
          if (isNaN(title[0]) || isNaN(title[1])) {
            options.xTitle = title[0];
            options.yTitle = title[1];
          }
          //数值存储初始化
          dataScope.dataValue=[];
          dataValue = dataScope.dataValue;
        }else{
          if (title[0] !== options.xTitle || title[1] !== options.yTitle) throw "Data Type Error（ mostly was the error from x,y axis title type";
          var mainPath = document.getElementById('path_0');
          pathValue = mainPath.getAttribute("d");
          count = dataValue.length;
          preValueY = dataValue[count - 1];    //上一个值
          totalMul = dataScope.totalMul; //总缩小倍数
          min = dataScope.min;
          max = dataScope.max;
        }

        //对除title外的剩余点进行path展示

        for(var i=path?0:length-xAxisLength;i<length;i++){
          nowData = data[i].split(",");
          if(nowData.length<2){
            continue;
          }
          if(!xCaState)xCalibration.push(nowData[0]);
          valueY = nowData[1];

          //无效点判断
          if(isNaN(valueY)){
            //后期考虑无效点时是否缩小x轴长度，还是固定为用户希望的长度？？？
            /*xAxisLength--;
            xSpacing = Math.floor(svgPathWidth / xAxisLength * 100)/100;
            pathValue = pathValue?pathValue.replace(/l *(?:\d+\.)?\d+/g,function(xSpacing){return function () {return "l"+xSpacing;}}(xSpacing)):"";*/
            continue;
          }

          //查看path属性，根据min和max设置M的起始值，后面值选用相对坐标
          //累计有效点
          count++;
          dataValue.push(valueY);//备份有效数据值
          //第一个点放在0点
          if(firstPointState && !path){
            pathValue += "M"+options.startPointX+","+options.startPointY;
            //获取第一个值
            firstValue = valueY;
            preValueY = valueY;
            firstPointState = false;
          }else {
            //将新的点放入path最后（后期要考虑长度，移动等情况）
            pathValue += " l" + xSpacing + "," + (-((valueY - preValueY) / totalMul)).toFixed(3) * 1;
            var chazhi = (valueY - firstValue) / totalMul;
            if (chazhi > max.value) {
              max.value = chazhi;
              max.index = count;
              //max.index = count>xAxisLength?xAxisLength*2-count:count;
            } else if (chazhi < min.value) {
              min.value = chazhi;
              min.index = count;
            }
            preValueY = valueY;
          }
        }
        //判断是否坐标超x轴限制，超限后左移
        if(count>xAxisLength){
          var ind = 0;
          var moveCount=count-xAxisLength;
          for(var new_i =0;new_i<moveCount;new_i++){
            count--;
            dataValue.shift();
            pathValue = pathValue.replace(/l *(?:\d+\.)?\d+[, ] *(-?(?:\d+\.)?\d+) */,function (total,lPointY) {
              ind += lPointY*1;
              return "";
            });
          }
          pathValue = pathValue.replace(/(M *(?:\d+\.)?\d+)[, ] *(-?(?:\d+\.)?\d+)/,function (total,mPointX,mPointY) {
            firstValue -= ind;
            return mPointX+","+(mPointY*1+ind);
          });

          if(moveCount >=max.index || moveCount>=min.index){
            var relativeData = pathValue.match(/[, ] *(-?(?:\d+\.)?\d+)/g);
            var now = 0;
            max.value = 0;
            max.index = 0;
            min.value = 0;
            min.index = 0;
            for(var j =1;j<relativeData.length;j++){
              now+=relativeData[j].match(/(-?(?:\d+\.)?\d+)/)[0]*1;
              if(-now>max.value){
                max.value = -now;
                max.index = j;
              }else if(-now<min.value){
                min.value = -now;
                min.index = j;
              }
            }
          }else{
            max.value += ind;
            min.value += ind;
            max.index -= moveCount;
            min.index -= moveCount;
          }
        }

        //如果图像超出画布，则等比缩小
        if((max.value -min.value) > options.svgHeight || (max.value - min.value)<options.svgHeight*0.9){
          [max.value,min.value,totalMul,pathValue] = shrink(max.value,min.value,totalMul,pathValue);
        }

        //如果出现新的最小值，则图像整体上移，获取新的最小值
        var rising = pathValue.match(/\d+[, ] *(-?(?:\d+\.)?\d+)/)[1] *1 - min.value -options.startPointY;
        if(Math.abs(rising) > 1){
          pathValue = pathValue.replace(regM,function(dec){return function(value){
            return ","+(value.match(/-?(?:\d+\.)?\d+/)[0]*1 - dec).toFixed(1);}}(rising));
        }

        //保存重要数据值
        dataScope.totalMul = totalMul;
        dataScope.xSpacing = xSpacing;
        dataScope.max = max;
        dataScope.min = min;
        dataScope.xAxisLength = xAxisLength;

        //此处考虑path路径动画展示效果
        //...

        //转化成html节点
        if(!path) {
          var pathStyle = options.pathStyle;
          var nodePath = createNode("path", {
            id: "path_0",
            d: pathValue,
            style: pathStyle,
            fill: "none"
          });
          var nodeG = createNode("g", {class: "mainPath"});
          nodeG.appendChild(nodePath);
          nodeParent.appendChild(nodeG);
          this.varState.path = true;
        }else{
          mainPath.setAttribute("d",pathValue);
        }
      }
    }

    function showChart(){//1.创建path，如果是live模式，则判断path是否存在；2使用pushPoint对path中增加点，并进行图像的调整；
      createPath.call(this,this.nodeSvg,this.defaultOptions.chartType);
      createYaxis.call(this,this.nodeSvg,this.defaultOptions.chartType);
    }

    function getAjaxData(options){
      var _this = this;
      var xhr = new XMLHttpRequest();
      //修复mozillar浏览器的部分bug
      if (xhr.overrideMimeType) {
        xhr.overrideMimeType("text/xml");
      }
      xhr.open("GET",options.src,true);
      xhr.onreadystatechange = function () {
        if(xhr.readyState == 4 && xhr.status == 200){
          _this.dataSource = xhr.responseText;
        }
      };
      xhr.send(null);
    }

    function getData(options){
      switch (options.type){
        case "live-data":
          getAjaxData.call(this,options);
          break;
        default:return false;
      }
      return true;
    }

    final.create = function (container,options) {
      //获取html的container容器
      var Container = document.getElementById(container);
      if(!container)throw "Error:Container is wrong!";
      if(!options) throw "Error:options is wrong!";


      //创建svg根节点并保存
      this.nodeSvg = createNode("svg",{id:"main_svg",width:"100%",height:"100%",xmlns:"http://www.w3.org/2000/svg"});
      //初始化
      init.call(this,Container);

      for(var item in options){
        if (this.defaultOptions.hasOwnProperty(item))this.defaultOptions[item]=options[item];
      }


      //获取数据
      if(!getData.call(this,this.defaultOptions))return -1;
      //定义y轴线样式
      //this.createYaxis(nodeSvg,this.defaultOptions.type);

      //...
      Container.appendChild(this.nodeSvg);
    };

    //返回window.charts对象
    return final;
});

charts.create("container",{
  type:"live-data",
  src:"http://ranranbaobao.cn/profile/csv.php",
  pollingTime:1000,
  xAxisLength:300
});
