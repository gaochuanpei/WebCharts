(function(root,create){
    root.charts = create(root);
})("undefined"!==typeof window?window:this,function (root) {
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

    final.init = function(outDiv){
      var _this = this;
      if(this.defaultOptions === undefined){
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
          xCalibration:[],          //x坐标集合
          xAxisLength:"auto",       //x轴长度
          svgWidth,
          svgHeight:svgHeight-totalTitleWidth,
          xTitleHeight,
          startPointX:yTitleWidth,
          startPointY:svgHeight-xTitleHeight
        };
      }
      if(this.dataSource === undefined){
        var value;
        Object.defineProperty(this,"dataSource",{
          get(){
            return value;
          },
          set(newValue){
            value = newValue;
            _this.showChart();
          },
          enumerable:false,
          configurable:false
        })
      }
    };

    final.createYaxis = function(nodeParent,typeCharts){
      if(typeCharts === "line"){
        var nodeG = createNode("g",{class:"y_axis"});
        var nodeLine = createNode("line",{x1:"0",y1:"290",x2:"800",y2:"290",style:"stroke:rgb(99,99,99);stroke-width:2"});
        nodeG.appendChild(nodeLine);
        nodeParent.appendChild(nodeG);
      }
    };

    final.createPath = function(nodeParent,typeCharts){
      function pushPoint(pathValue,valueY,preValueY){
        var reg = new RegExp(/[, ] *(-?(?:\d+\.)?\d+)/);
        var reg2 = new RegExp(/[LM] *\d+\.?\d+[, ] *-?(?:\d+\.)?\d+$/);
        console.log(pathValue);
        var preSvgValue = pathValue.match(reg2)[0];
        var preSvgValueY = preSvgValue.match(reg)[1];
        var preSvgValueX = preSvgValue.match(/[LM] *(-?\d+)/)[1];
        pathValue += " L"+(preSvgValueX*1+1)+","+(preSvgValueY*1-(valueY-preValueY)).toFixed(0);
        return [pathValue,valueY]
      }
      if(typeCharts === "line"){
        var min = 0,max = 0;
        //对获取到的数据进行操作，数据在this.dataSource中
        var data = this.dataSource.split("\n");
        //获取x,ytitle
        var title = data.shift().split(",");
        if(isNaN(title[0]) || isNaN(title[1])){
          this.defaultOptions.xTitle = title[0];
          this.defaultOptions.yTitle = title[1];
        }
        //对除title外的剩余点进行path展示
        var pathValue="",
            firstValue,
            valueY,       //当前值
            preValueY,    //上一个值
            reg = new RegExp(/[, ] *-?\d+/g),
            totalMul = 1, //总缩小倍数
            svgMax,       //svg画布中的最大值
            svgMin;       //svg画布中的最小值
        var xCalibration = this.defaultOptions.xCalibration;
        xCalibration = Array.isArray(xCalibration) === "Array"?xCalibration:[];
        var options = this.defaultOptions;
        if(xCalibration.length>0){
          for(var i=0;i<data.length;i++){
            var nowData = data[i].split(",");
            valueY = nowData.length>1?nowData[1]:nowData[0];
            if(isNaN(valueY))continue;
            //查看path属性，根据min和max设置M的起始值，后面值选用相对坐标
            if(i===0)pathValue += "M";
          }
        }else{
          var ii = 0;
          for(var i=0;i<data.length;i++){
            var nowData = data[i].split(",");
            if(nowData.length<2)continue;
            xCalibration.push(nowData[0]);
            valueY = nowData[1];
            if(isNaN(valueY))continue;
            //查看path属性，根据min和max设置M的起始值，后面值选用相对坐标
            //第一个点放在0点
            if(i===0){
              pathValue += "M"+options.startPointX+","+options.startPointY;
              /*min = valueY;
              max = valueY;*/
              //获取第一个值
              firstValue = valueY;
              preValueY = valueY;
              continue;
            }
            //将新的点放入path最后（后期要考虑长度，移动等情况）
            [pathValue,preValueY] = pushPoint(pathValue,valueY,preValueY);
            //如果出现新的最小值，则图像整体上移，获取新的最小值
            if(ii>1020-30){
              console.log(max,min);
            }
            ii++;
            if(valueY-firstValue<min){
              pathValue = pathValue.replace(reg,function(dec){return function(value){return ","+(Math.floor(value.match(/-?\d+/) - dec));}}(min-(valueY-firstValue)));
              min = valueY-firstValue;
              svgMin = min/totalMul;
            }else {
              //获取新的最大值
              if (valueY - firstValue > max) {
                max = valueY - firstValue;
                svgMax = max / totalMul;
              }
            }
            //如果图像超出画布，则等比缩小
            if(svgMax - svgMin > options.svgHeight){
              var multiple = Math.ceil((svgMax - svgMin)/options.svgHeight);
              totalMul = totalMul * multiple;
              svgMax = svgMax/multiple;
              svgMin = svgMin/multiple;
              pathValue = pathValue.replace(reg,function(mul){return function(value){
                var result = ","+(value.match(/-?\d+/)/mul).toFixed(0);
                return result;}}(multiple));//最终时测试此处闭包不会释放资源?(若不释放的话可否使用具名函数循环代替）
            }
          }
          console.log(pathValue);
        }
        //...
        var nodePath = createNode("path",{d:pathValue,style:"stroke:rgb(99,99,99);stroke-width:2"});
        var nodeG = createNode("g",{class:"mainPath"});
        nodeG.appendChild(nodePath);
        nodeParent.appendChild(nodeG);
        return [min,max];
      }
    };
    final.showChart = function(){
      this.createPath(this.nodeSvg,this.defaultOptions.chartType);
      this.createYaxis(this.nodeSvg,this.defaultOptions.chartType);
    };

    final.getAjaxData = function(options){
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
    final.getData = function(options){
      var _this = this;
      switch (options.type){
        case "live-data":
          _this.getAjaxData(options);
          break;
        default:return false;
      }
      return true;
    };

    final.create = function (container,options) {

      //获取html的container容器
      var Container = document.getElementById(container);

      //创建svg根节点并保存
      this.nodeSvg = createNode("svg",{id:"main_svg",width:"100%",height:"100%",xmlns:"http://www.w3.org/2000/svg"});

      //初始化
      this.init(Container);

      if(!container)throw "Error:Container is wrong!";

      if(!options) return 0;
      for(var item in options){
        if (this.defaultOptions[item] !==undefined)this.defaultOptions[item]=options[item];
      }


      //获取数据
      if(!this.getData(this.defaultOptions))return -1;
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