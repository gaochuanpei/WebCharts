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
          dataValue:[],
          xCalibration:[],          //x坐标刻度集合
          xAxisLength:"auto",       //x轴长度
          svgWidth,
          svgHeight:svgHeight-totalTitleWidth-xTitleHeight,
          xTitleHeight,
          startPointX:yTitleWidth,
          startPointY:svgHeight-xTitleHeight
        };
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
      if(typeCharts === "line"){
        var nodeG = createNode("g",{class:"y_axis"});
        var nodeLine = createNode("line",{x1:"0",y1:"290",x2:"800",y2:"290",style:"stroke:rgb(99,99,99);stroke-width:2"});
        nodeG.appendChild(nodeLine);
        nodeParent.appendChild(nodeG);
      }
    }

    function createPath(nodeParent,typeCharts){
      function shrink(max,min,totalMul,pathValue){
        var multiple = (max -min)/options.svgHeight;
        if(multiple.toFixed(2)>1) {
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
        }
        return [max,min,totalMul,pathValue];
      }
      if(typeCharts === "line"){
        var xCaState, //判断x轴长度是否指定
            count = 0,    //判断有效点个数
            nowData,
            min = 0,
            max = 0,
            pathValue="",
            firstValue,
            valueY,       //当前值
            preValueY,    //上一个值
            reg = new RegExp(/[, ] *-?(?:\d+\.)?\d+/g),
            regM = new RegExp(/[, ] *-?(?:\d+\.)?\d+/),
            totalMul = 1, //总缩小倍数
            xCalibration = this.defaultOptions.xCalibration,
            data = this.dataSource.split("\n"),
            title = data.shift().split(","),
            options = this.defaultOptions,
            dataValue = options.dataValue;

        //x坐标集合初始化
        xCalibration = Array.isArray(xCalibration) === "Array"?xCalibration:[];
        xCaState = xCalibration.length>0;
        //x轴长度未定，建议定默认长度
        var length = data.length;
        var svgPathWidth = options.svgWidth-options.startPointX;
        var xAxisLength = options.xAxisLength==="auto"?length:options.xAxisLength;
        var xSpacing = Math.floor(svgPathWidth / xAxisLength * 100)/100;
        var firstPointState = true;

        //获取x,ytitle
        if(isNaN(title[0]) || isNaN(title[1])){
          options.xTitle = title[0];
          options.yTitle = title[1];
        }

        //对除title外的剩余点进行path展示
        if((!Array.isArray(dataValue))||dataValue.length>0){
          options.dataValue=[];
          dataValue = options.dataValue;
        }

        for(var i=0;i<length;i++){
          nowData = data[i].split(",");
          if(nowData.length<2)continue;
          if(!xCaState)xCalibration.push(nowData[0]);
          valueY = nowData[1];

          //无效点判断
          if(isNaN(valueY)){
            xAxisLength--;
            xSpacing = Math.floor(svgPathWidth / xAxisLength * 100)/100;
            pathValue = pathValue?pathValue.replace(/l *(?:\d+\.)?\d+/g,function(xSpacing){return function () {return "l"+xSpacing;}}(xSpacing)):"";
            continue;
          }

          //查看path属性，根据min和max设置M的起始值，后面值选用相对坐标
          //第一个点放在0点
          if(firstPointState){
            pathValue += "M"+options.startPointX+","+options.startPointY;
            //获取第一个值
            firstValue = valueY;
            preValueY = valueY;
            firstPointState = false;
            continue;
          }else {

            //累计有效点
            count++;
            dataValue.push(valueY);//备份有效数据值

            //将新的点放入path最后（后期要考虑长度，移动等情况）
            pathValue += " l" + xSpacing + "," + (-((valueY - preValueY) / totalMul)).toFixed(3) * 1;
            var chazhi = (valueY - firstValue) / totalMul;
            if (chazhi > max) {
              max = chazhi;
            } else {
              if (chazhi < min) min = chazhi;
            }
            preValueY = valueY;
            //判断是否坐标超x轴限制，超限后左移
            if(count>xAxisLength){
              pathValue = pathValue.replace(/(M *(?:\d+\.)?\d+)[, ] *(-?(?:\d+\.)?\d+) *l *(?:\d+\.)?\d+[, ] *(-?(?:\d+\.)?\d+)/,function (total,mPointX,mPointY,lPointY) {
                max += lPointY*1;
                min += lPointY*1;
                return mPointX+","+(mPointY*1+lPointY*1)
              })
            }
          }

          //如果图像超出画布，则等比缩小
          if((max -min) > options.svgHeight){
            [max,min,totalMul,pathValue] = shrink(max,min,totalMul,pathValue);
          }
          //如果出现新的最小值，则图像整体上移，获取新的最小值
          var rising = pathValue.match(/\d+[, ] *(-?(?:\d+\.)?\d+)/)[1] *1 - min -options.startPointY;
          if(rising > 0){
            pathValue = pathValue.replace(regM,function(dec){return function(value){
              return ","+(value.match(/-?(?:\d+\.)?\d+/)[0]*1 - dec).toFixed(1);}}(rising));
          }

        }

        //转化成html节点
        var nodePath = createNode("path",{d:pathValue,style:"stroke:rgb(48,143,180);stroke-width:2",fill:"none"});
        var nodeG = createNode("g",{class:"mainPath"});
        nodeG.appendChild(nodePath);
        nodeParent.appendChild(nodeG);
        return [min,max];
      }
    }
    function showChart(){//1.创建path，如果是live模式，则判断path是否存在；2使用pushPoint对path中增加点，并进行图像的调整；
      createPath.call(this,this.nodeSvg,this.defaultOptions.chartType);
      createYaxis(this.nodeSvg,this.defaultOptions.chartType);
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
    };
    function getData(options){
      switch (options.type){
        case "live-data":
          getAjaxData.call(this,options);
          break;
        default:return false;
      }
      return true;
    };

    final.create = function (container,options) {
      if(!container)throw "Error:Container is wrong!";
      if(!options) throw "Error:options is wrong!";

      //获取html的container容器
      var Container = document.getElementById(container);

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
  pollingTime:1000
});
