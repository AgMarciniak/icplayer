function AddonLine_Number_create() {
    var presenter = function () {};

    presenter.configuration = {};

    presenter.errorCodes = {
        'MIN01' : 'Min value cannot be empty.',
        'MIN02' : 'Min value must be a number.',
        'MAX01' : 'Max value cannot be empty.',
        'MAX02' : 'Max value must be a number',
        'MIN/MAX01' : 'Min value cannot be lower than Max value.',
        'RAN01' : 'One or more ranges are invalid.',
        'STEP01' : 'The value in Step property is invalid.',
        'VAL01' : 'One or more X axis values are invalid.'
    };

    presenter.run = function(view, model) {
        presenter.$view = $(view);
        presenter.$view.disableSelection();

        presenter.configuration = presenter.readConfiguration(model);

        if (presenter.configuration.isError) {
            return DOMOperationsUtils.showErrorMessage(presenter.$view, presenter.errorCodes, presenter.configuration.errorCode)
        }

        presenter.createSteps();
            console.log(presenter.configuration.shouldDrawRanges)
        drawRangeFromList(presenter.configuration.shouldDrawRanges);
    };

    function calculateStepWidth(xAxisValues) {
        var xAxisWidth = presenter.$view.find('#x-axis').width() - 1;

        return xAxisWidth / (xAxisValues.length - 1);
    }

    function getXAxisValues() {
        var configuration = presenter.configuration;
        var xAxisValues = [];

        for (var i = configuration.min; i <= configuration.max; i += configuration.step) {
            xAxisValues.push(i);
        }
        return xAxisValues;
    }

    function setIsInRange(e) {
        presenter.configuration.mouseData.isInRange = false;

        $.each(presenter.configuration.drawnRangesData.ranges, function() {
            if ( presenter.isValueInRange($(e.target).attr('value'), this, false) ) {
                presenter.configuration.mouseData.isInRange = true;
                return;
            }
        });
    }

    function setClickedElementRange(e) {
        var allRanges = presenter.configuration.drawnRangesData.ranges.concat(presenter.configuration.shouldDrawRanges);

        $.each(allRanges, function(i) {
            if ( presenter.isValueInRange($(e.target).attr('value'), this, false) ) {
                presenter.configuration.mouseData.clickedElementRange = allRanges[i];
            }
        });
    }

    function setClickedElementPosition(e) {
        var range = presenter.configuration.mouseData.clickedElementRange;
        presenter.configuration.mouseData.isStartClicked = false;
        presenter.configuration.mouseData.isEndClicked = false;
        presenter.configuration.mouseData.isMiddleClicked = false;

        if (range.start.element[0] == $(e.target).parent()[0]) {
            presenter.configuration.mouseData.isStartClicked = true;
        }

        else if (range.end.element[0] == $(e.target).parent()[0]) {
            presenter.configuration.mouseData.isEndClicked = true;
        }

        else {
            presenter.configuration.mouseData.isMiddleClicked = true;
        }
    }

    function createClickArea(element, value) {
        var clickArea = $('<div></div>');
        var selectedRange = $('<div></div>');

        selectedRange.addClass('selectedRange');
        clickArea.addClass('clickArea');

        $(element).append(clickArea);
        clickArea.attr('value', value);

        clickArea.on('mousedown', function (e){
            presenter.configuration.mouseData.isMouseDown = true;
            if ( !presenter.configuration.drawnRangesData.isDrawn ) {
                selectedRange.addClass('current');
                element.append(selectedRange);
            } else {
                $.when( setClickedElementRange(e) ).then( function() {
                    setClickedElementPosition(e);
                });
            }

            drawRangeFromEvent(e);

            setIsInRange(e);

        });

        clickArea.on('mouseup', function (e){
            if (!presenter.configuration.drawnRangesData.isDrawn) {
                var startElement = presenter.$view.find('.current').parent();
                var endElement = $(e.target).parent();
                addEndRangeImages(startElement, endElement, true, true);
            }

            presenter.$view.find('.current').removeClass('current');
            presenter.configuration.mouseData.isMouseDown = false;
            presenter.configuration.drawnRangesData.isDrawn = true;
        });

        clickArea.on('mouseenter', function(e) {
            if(presenter.configuration.mouseData.isMouseDown) {
                drawRangeFromEvent(e);

                setIsInRange(e);

                if (presenter.configuration.mouseData.isStartClicked) {
                    var drawnRange = presenter.configuration.mouseData.clickedElementRange.start.element.find('.selectedRange');
                    var startValue = presenter.configuration.mouseData.clickedElementRange.start.value;

                    var newStartElement = presenter.$view.find('.clickArea[value=' + (startValue + 1) + ']').parent();
                    var newDrawnRange = drawnRange.clone(true);

                    if (presenter.configuration.mouseData.isInRange) {
                        newDrawnRange.css({
                            'width' : $(drawnRange).width() - presenter.configuration.stepWidth + 'px'
                        });
                    }

                    drawnRange.remove();
                    newStartElement.append(newDrawnRange);

                    console.log(drawnRange)
                } else if (presenter.configuration.mouseData.isEndClicked) {
                    console.log('end')
                } else if (presenter.configuration.mouseData.isMiddleClicked) {
                    console.log('middd')
                }

            }
        });

        presenter.$view.on('mouseup', function (e){
            presenter.$view.find('.current').removeClass('current');
            presenter.configuration.mouseData.isMouseDown = false;
        });

        clickArea.css({
            'width' :  presenter.configuration.stepWidth,
            'left' : - (presenter.configuration.stepWidth / 2) + 'px'
        });

        moveYAxisClickArea();
    }

    presenter.isValueInRange = function( value, range, takeExcludeIntoConsideration ) {
        var start, end;
        if (takeExcludeIntoConsideration) {
            start = range.start.include ? range.start.value : range.start.value + 1;
            end = range.end.include ? range.end.value + 1 : range.end.value;
        } else {
            start = range.start.value;
            end = range.end.value + 1;
        }

        for( var i = start; i < end; i++ ) {
            if ( i == value ) {
                return true;
            }
        }
        return false;
    };

    function toggleIncludeImage(imageWrapper, shouldInclude) {
        if (shouldInclude) {
            imageWrapper.addClass('include');
            imageWrapper.removeClass('exclude');
        } else {
            imageWrapper.addClass('exclude');
            imageWrapper.removeClass('include');
        }
    }

    function excludeElementFromRange(element, range) {
        var rangeStartImage = range.start.element.find('.rangeImage');
        var rangeEndImage = range.end.element.find('.rangeImage');

        if (element.parent()[0] == range.start.element[0] && !presenter.configuration.mouseData.isMouseDown) {
            range.start.include = !range.start.include;
            toggleIncludeImage(rangeStartImage, range.start.include);

        } else if (element.parent()[0] == range.end.element[0] && !presenter.configuration.mouseData.isMouseDown) {
            range.end.include = !range.end.include;
            toggleIncludeImage(rangeEndImage, range.end.include);

        } else {
            var currentRanges = presenter.configuration.drawnRangesData.ranges;
            var currentIndex = 0;

            $.each(presenter.configuration.drawnRangesData.ranges, function(i) {
                if ( presenter.isValueInRange(element.parent().find('.clickArea').attr('value'), this, false) ) {
                    currentIndex = i;
                }
            });

            var first = {
                start : {
                    element: currentRanges[currentIndex].start.element,
                    include: currentRanges[currentIndex].start.include,
                    value: currentRanges[currentIndex].start.element.find('.clickArea').attr('value')
                },
                end: {
                    element: element.parent(),
                    include: false,
                    value: element.parent().find('.clickArea').attr('value')
                },
                shouldDrawRange: true
            };

            var second = {
                start : {
                    element: element.parent(),
                    include: false,
                    value: element.parent().find('.clickArea').attr('value')
                },
                end: {
                    element: currentRanges[currentIndex].end.element,
                    include: currentRanges[currentIndex].end.include,
                    value: currentRanges[currentIndex].end.element.find('.clickArea').attr('value')
                },
                shouldDrawRange: true
            };

            presenter.configuration.drawnRangesData.ranges.splice(currentIndex, 1, first, second);

            clearDrawnElements();
            drawRangeFromList(presenter.configuration.drawnRangesData.ranges);
        }
    }

    function clearDrawnElements() {
        $.each(presenter.configuration.drawnRangesData.ranges, function() {
            var currentDrawnElement = this.start.element.find('.selectedRange');
            currentDrawnElement.remove();
        });
    }

    function drawRangeFromEvent(e) {
        if (presenter.configuration.drawnRangesData.isDrawn) {
            var currentElement = $(e.target);
            var value = currentElement.attr('value');
//            var index = 0;
//
//            $.each(presenter.configuration.drawnRangesData.ranges, function(i) {
//                if ( presenter.isValueInRange(currentElement.parent().find('.clickArea').attr('value'), this, false) ) {
//                    index = i;
//                }
//            });

            /*if ( presenter.isValueInRange(value, presenter.configuration.drawnRangesData.ranges[index], false) ) {
                excludeElementFromRange(currentElement, presenter.configuration.drawnRangesData.ranges[index]);
            }*/

            return;
        }
        var startElement = presenter.$view.find('.current').parent();
        var endElement = $(e.target).parent();
        var start = parseFloat(startElement.css('left'));
        var end = parseFloat(endElement.css('left'));
        var difference = Math.abs(start - end);
        var currentSelectedRange = presenter.$view.find('.current');
        currentSelectedRange.css('width', difference + 2 + 'px');

        var drawnRange = {
            start : { element: startElement, include: true, value: startElement.find('.clickArea').attr('value') },
            end: { element: endElement, include: true, value: endElement.find('.clickArea').attr('value') }
        };

        presenter.configuration.drawnRangesData.ranges[0] = drawnRange;

        if (start > end) {
            currentSelectedRange.css('left', - (difference) + 'px');
        }

    }

    function drawRangeFromList(rangesList) {

        $.each(rangesList, function(i) {
            var startElement = presenter.$view.find('.clickArea[value=' + this.start.value + ']').parent();
            var endElement = presenter.$view.find('.clickArea[value=' + this.end.value + ']').parent();

//                if (!this.start.element || !this.end.element) {
//                    presenter.configuration.ranges[i].start.element = startElement;
//                    presenter.configuration.ranges[i].end.element = endElement;
//                }

            var start = parseFloat($(startElement).css('left'));
            var end = parseFloat(endElement.css('left'));
            var difference = Math.abs(start - end);
            var range = $('<div></div>');
            range.addClass('selectedRange');
            range.css('width', difference + 2 + 'px');
            startElement.append(range);

            if (start > end) {
                range.css('left', - (difference) + 'px');
            }

            addEndRangeImages(startElement, endElement, this.start.include, this.end.include);
        });
    }

    function addEndRangeImages(startElement, endElement, includeStart, includeEnd) {
        startElement.find('.rangeImage').remove();

        var imageContainer = $('<div></div>');
        imageContainer.addClass('rangeImage');

        var endImageContainer = imageContainer.clone(true);
        endImageContainer.addClass(includeEnd ? 'include' : 'exclude');
        endElement.append(endImageContainer);

        if (startElement[0] != endElement[0]) {
            var startImageContainer = imageContainer.clone(true);
            startImageContainer.addClass(includeStart ? 'include' : 'exclude');
            startElement.append(startImageContainer);
        }
    }

    presenter.createSteps = function () {
        var xAxisValues = getXAxisValues();
        presenter.configuration.stepWidth = calculateStepWidth(xAxisValues);
        var isDrawOnlyChosen = presenter.configuration.axisXValues.length > 0;

        for (var i = 0; i < xAxisValues.length; i++) {
            var stepLine = $('<div></div>');
            stepLine.addClass('stepLine');

            if (xAxisValues[i] == 0) {
                var innerHeight = presenter.$view.find('#inner').height();
                var yAxis = presenter.$view.find('#y-axis');
                var xAxis = presenter.$view.find('#x-axis');

                yAxis.height(innerHeight);
                yAxis.css({
                    'top' : - (innerHeight / 2),
                    'left' : presenter.configuration.stepWidth * i
                });
                xAxis.append(yAxis);
            } else {
                var text = $('<div></div>');
                text.addClass('stepText');
                text.html(xAxisValues[i]);
                text.css('left', - new String(xAxisValues[i]).length * (4) + 'px');


                if (isDrawOnlyChosen && presenter.configuration.showAxisXValues) {
                    if ($.inArray(xAxisValues[i], presenter.configuration.axisXValues) !== -1) {
                        stepLine.append(text);
                    }
                } else if (presenter.configuration.showAxisXValues) {
                    stepLine.append(text);
                }

            }

            stepLine.css('left', presenter.configuration.stepWidth * i);
            createClickArea(stepLine, xAxisValues[i]);
            presenter.$view.find('#x-axis').append(stepLine);
        }
    };

    function moveYAxisClickArea() {
        var yAxisClickArea = $('#y-axis .clickArea');
        yAxisClickArea.css('top', ($('#y-axis').height() / 2) - 50 + 'px');
    }

    function checkIsMinLowerThanMax(min, max) {
        var parsedMin = parseInt(min, 10);
        var parsedMax = parseInt(max, 10);
        return parsedMin < parsedMax;
    }

    presenter.readConfiguration = function(model) {
        var isMinEmpty = ModelValidationUtils.isStringEmpty(model['Min']);

        if(isMinEmpty) {
            return {
                'isError' : true,
                'errorCode' : 'MIN01'
            }
        }

        var isMaxEmpty = ModelValidationUtils.isStringEmpty(model['Max']);

        if(isMaxEmpty) {
            return {
                'isError' : true,
                'errorCode' : 'MAX01'
            }
        }

        var isMinLowerThanMax = checkIsMinLowerThanMax(model['Min'], model['Max']);

        if(!isMinLowerThanMax) {
            return {
                'isError' : true,
                'errorCode' : 'MIN/MAX01'
            }
        }

        var validatedMin = ModelValidationUtils.validateInteger(model['Min']);
        var validatedMax = ModelValidationUtils.validateInteger(model['Max']);
        var min, max;

        if(validatedMin.isValid) {
            min = validatedMin.value;
        } else {
            return {
                'isError' : true,
                'errorCode' : 'MIN02'
            }
        }

        if(validatedMax.isValid) {
            max = validatedMax.value;
        } else {
            return {
                'isError' : true,
                'errorCode' : 'MAX02'
            }
        }

        var rangesList = Helpers.splitLines(model['Ranges']);
//        var rangesList = model['Ranges'].split(/[\n\r]+/);
        var rangesPattern = /(\(|<){1}[(?P \d)-]+,[(?P \d)-]+(\)|>){1},[ ]*(0|1){1}/i; // matches i.e. (1, 0), 0 or <2, 15), 1
        var validatedShouldDrawRanges = [];
        var validatedOtherRanges = [];

        $.each(rangesList, function(i) {
            var rangeString = this.toString();

            if( !rangesPattern.test(rangeString) ) {
                return {
                    'isError' : true,
                    'errorCode' : 'RAN01'
                }
            }

            var regexResult = rangesPattern.exec(rangeString)[0];
            var brackets = regexResult.match(/[\(\)<>]+/g);
            var onlyNumbersAndCommas = regexResult.replace(/[ \(\)<>]*/g, '');
            var onlyNumbers = onlyNumbersAndCommas.split(',');
            var min = onlyNumbers[0];
            var max = onlyNumbers[1];
            var minInclude = brackets[0] == '<';
            var maxInclude = brackets[1] == '>';
            var shouldDrawRange = onlyNumbers[2] == '1';

            if(!checkIsMinLowerThanMax(min, max)) {
                return {
                    'isError' : true,
                    'errorCode' : 'MIN/MAX01'
                }
            }

            var validatedRange = {
                start: { value : parseInt(min, 10), include: minInclude, element: null },
                end: { value: parseInt(max, 10), include: maxInclude, element: null }
            };

            if (shouldDrawRange) {
                validatedShouldDrawRanges.push(validatedRange);
            } else {
                validatedOtherRanges.push(validatedRange);
            }

        });

        var validatedIsActivity = ModelValidationUtils.validateBoolean(model['Is Activity']);
        var validatedStep;

        if (model['Step'] == '') {
            validatedStep = 1;
        } else {
            validatedStep = ModelValidationUtils.validateIntegerInRange(model['Step'], 50, 1);

            if (!validatedStep.isValid) {
                return {
                    'isError' : true,
                    'errorCode' : 'STEP01'
                }
            }
        }

        var validatedAxisXValues = [];

        if (model['Axis X Values'] !== '') {
            var splittedValues = model['Axis X Values'].split(',');
            for (var i = 0; i < splittedValues.length; i++) {
                var value = splittedValues[i].replace(' ', '');
                var validatedValue = ModelValidationUtils.validateIntegerInRange(value, max, min);

                if (!validatedValue.isValid) {
                    return {
                        'isError' : true,
                        'errorCode' : 'VAL01'
                    }
                }

                validatedAxisXValues.push(validatedValue.value);
            }
        }

        var validatedShowAxisXValues = ModelValidationUtils.validateBoolean(model['Show Axis X Values']);

        return {
            'isError' : false,
            'min' : min,
            'max' : max,
            'shouldDrawRanges' : validatedShouldDrawRanges,
            'otherRanges' : validatedOtherRanges,
            'isActivity' : validatedIsActivity,
            'step' : validatedStep.value,
            'showAxisXValues' : validatedShowAxisXValues,
            'axisXValues' : validatedAxisXValues,
            'mouseData' : {
                'isMouseDown' : false,
                'isInRange' : false
            },
            'drawnRangesData' : {
                'isDrawn' : false,
                'ranges' : []
            }
        }
    };

    return presenter;
}       