function Addonvideo_create() {
    var presenter = function() {};

    presenter.currentMovie = 0;
    presenter.videoContainer = null;
    presenter.$view = null;
    presenter.files = [];
    presenter.video = null;
    presenter.controlBar = null;
    presenter.isCurrentlyVisible = true;
    presenter.isVideoLoaded = false;
    presenter.metadadaLoaded = false;
    presenter.isPreview = false;
    presenter.captions = [];
    presenter.captionDivs = [];
    presenter.metadataQueue = [];
    presenter.areSubtitlesHidden = false;
    presenter.calledFullScreen = false;

    presenter.stylesBeforeFullscreen = {
        changedStyles: false,
        style: null,
        moduleWidth: 0,
        moduleHeight: 0,
        actualTime: -1,
        className: ''
    };

    presenter.originalVideoSize = {
        width: 0,
        height: 0
    };

    presenter.captionsOffset = {
        left: 0,
        top: 0
    };

    presenter.lastWidthAndHeightValues = {
        width: 0,
        height: 0
    };

    presenter.configuration = {
        isValid: false,
        addonSize: {
            width: 0,
            height: 0
        },
        addonID: null,
        isVisibleByDefault: null,
        shouldHideSubtitles: null,
        defaultControls: null,
        files: [],
        height: 0
    };

    presenter.lastSentCurrentTime = 0;

    presenter.metadataLoadedDecorator = function (fn) {
        return function () {
            if (presenter.metadadaLoaded) {
                return fn.apply(this, arguments);
            } else {
                presenter.pushToMetadataQueue(fn, arguments);
            }
        }
    };

    presenter.pushToMetadataQueue = function (fn, providedArguments) {
        presenter.metadataQueue.push({
            function: fn,
                arguments: providedArguments,
                self: this
        });
    };

    presenter.upgradeModel = function (model) {
        return presenter.upgradePoster(model);
    };

    presenter.upgradePoster = function (model) {
        var upgradedModel = {};
        $.extend(true, upgradedModel, model); // Deep copy of model object

        for (var i = 0; i < model.Files.length; i++) {
            if (!upgradedModel.Files[i].Poster) {
                upgradedModel.Files[i].Poster = "";
            }
        }

        return upgradedModel;
    };



    presenter.callMetadataLoadedQueue = function () {
        for (var i = 0; i < presenter.metadataQueue.length; i++) {
            var queueElement = presenter.metadataQueue[i];
            queueElement.function.call(queueElement.self, queueElement.arguments);
        }

        presenter.metadataQueue = [];
    };

    presenter.ERROR_CODES = {
        'MEDIA_ERR_ABORTED' : 1,
        'MEDIA_ERR_DECODE' : 2,
        'MEDIA_ERR_NETWORK' : 3,
        'MEDIA_ERR_SRC_NOT_SUPPORTED' : [4, 'Ups ! Looks like your browser doesn\'t support this codecs. Go <a href="https://tools.google.com/dlpage/webmmf/" > -here- </a> to download WebM plugin']
    };

    presenter.getVideoErrorMessage = function (errorCode) {
        var errorMessage = 'We are terribly sorry, but an error has occurred: ';

        switch (errorCode) {
            case presenter.ERROR_CODES.MEDIA_ERR_ABORTED:
                errorMessage += 'you aborted the video playback.';
                break;
            case presenter.ERROR_CODES.MEDIA_ERR_NETWORK:
                errorMessage += 'a network error caused the video download to fail part-way.';
                break;
            case presenter.ERROR_CODES.MEDIA_ERR_DECODE:
                errorMessage += 'the video playback was aborted due to a corruption problem or because the video used features your browser did not support.';
                break;
            case presenter.ERROR_CODES.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage += 'the video could not be loaded, either because the server or network failed or because the format is not supported.';
                break;
            default:
                errorMessage += 'unknown.';
                break;
        }

        return errorMessage + ' Please refresh page.';
    };

    presenter.videoTypes = [
        { name : 'MP4 video', type : 'video/mp4'},
        { name : 'Ogg video', type : 'video/ogg'},
        { name : 'WebM video', type : 'video/webm'}
    ];

    presenter.VIDEO_STATE = {
        STOPPED: 0,
        PLAYING: 1,
        PAUSED: 2
    };

    function fullScreenChange () {
        if (presenter.configuration.isFullScreen) {
            $(presenter.videoContainer).css({
                width: "100%",
                height: "100%"
            });

            $(presenter.videoObject).css({
                width: "100%",
                height: "100%"
            });
        } else {
            $(presenter.videoContainer).css({
                width: presenter.configuration.dimensions.container.width + 'px',
                height: presenter.configuration.dimensions.container.height + 'px'
            });
            $(presenter.video).css({
                width: presenter.configuration.dimensions.video.width + 'px',
                height: presenter.configuration.dimensions.video.height + 'px'
            })
        }
    }

    presenter.registerHook = function() {
        presenter.mathJaxHook = MathJax.Hub.Register.MessageHook("End Process", function mathJaxResolve(message) {
            if ($(message[1]).hasClass('ic_page')) {
                presenter.mathJaxProcessEndedDeferred.resolve();
            }
        });
    };

    presenter.setPlayerController = function (controller) {
        var mathJaxDeferred = new jQuery.Deferred();
        presenter.mathJaxProcessEndedDeferred = mathJaxDeferred;
        presenter.mathJaxProcessEnded = mathJaxDeferred.promise();

        presenter.registerHook();

        presenter.eventBus = controller.getEventBus();
        presenter.eventBus.addEventListener('PageLoaded', this);

        var pageLoadedDeferred = new jQuery.Deferred();
        presenter.pageLoadedDeferred = pageLoadedDeferred;
        presenter.pageLoaded = pageLoadedDeferred.promise();
    };

    presenter.onEventReceived = function (eventName, eventData) {
        presenter.pageLoadedDeferred.resolve();
        if(eventData.value == 'dropdownClicked') {
            presenter.metadadaLoaded = false;
            presenter.videoObject.load();
        }
    };

    presenter.createEndedEventData = function (currentVideo) {
        return {
            source: presenter.configuration.addonID,
            item: '' + (currentVideo + 1),
            value: 'ended'
        };
    };

    presenter.formatTime = function addonVideo_formatTime (seconds) {
        if (seconds < 0 || isNaN(seconds)) {
            return "00:00";
        }
        var minutes = Math.floor(seconds / 60);
        minutes = (minutes >= 10) ? minutes : "0" + minutes;
        seconds = Math.floor(seconds % 60);
        seconds = (seconds >= 10) ? seconds : "0" + seconds;
        return minutes + ":" + seconds;
    };

    presenter.sendTimeUpdateEvent = function Video_sendTimeUpdate(formattedTime) {
        presenter.eventBus.sendEvent('ValueChanged', {
            source: presenter.configuration.addonID,
            item: (presenter.currentMovie + 1),
            value : formattedTime
        });
    };

    presenter.sendVideoEndedEvent = function () {
        var eventData = presenter.createEndedEventData(presenter.currentMovie);
        presenter.eventBus.sendEvent('ValueChanged', eventData);
    };

    presenter.stopPropagationOnClickEvent = function(e) {
        e.stopPropagation();
    };

    presenter.setMetaDataOnMetaDataLoadedEvent = function() {
        if (DevicesUtils.isFirefox()) {
            presenter.$view.find(".video-container").prepend(presenter.videoObject);
        }

        presenter.metadadaLoaded = true;
        presenter.originalVideoSize = presenter.getVideoSize(presenter.configuration.addonSize, presenter.videoObject);
        presenter.calculateCaptionsOffset(presenter.configuration.addonSize, true);

        if (presenter.controlBar !== null) {
            presenter.$view.find('.video-container').append(presenter.controlBar.getMainElement());
            presenter.controlBar.setMaxDurationTime(presenter.videoObject.duration);
            if (presenter.stylesBeforeFullscreen.actualTime !== -1) {
                presenter.videoObject.currentTime = presenter.stylesBeforeFullscreen.actualTime;
                presenter.videoObject.play();
                presenter.stylesBeforeFullscreen.actualTime = -1;
            }
        }

        presenter.callMetadataLoadedQueue();
    };

    presenter.calculateCaptionsOffset = function (size, changeWidth) {
        var videoSize = presenter.getVideoSize(size, presenter.videoObject);

        presenter.captionsOffset.left = Math.abs(size.width - videoSize.width) / 2;
        presenter.captionsOffset.top = Math.abs(size.height - videoSize.height) / 2;



        presenter.$captionsContainer.css({
            top: presenter.captionsOffset.top,
            left: presenter.captionsOffset.left,
            position: "relative"
        });

        if (changeWidth) {
            presenter.$captionsContainer.css({
                width: videoSize.width,
                height: videoSize.height
            });
        }
    };

    presenter.getVideoSize = function (size, video) {
        //https://stackoverflow.com/questions/17056654/getting-the-real-html5-video-width-and-height
        var videoRatio = video.videoWidth / video.videoHeight;
        var width = size.width, height = size.height;
        var elementRatio = width / height;

        if( elementRatio > videoRatio ) {
            width = height * videoRatio;
        } else {
            height = width / videoRatio;
        }

        return {
            width: width,
            height: height
        };
    };

    function setVideoStateOnPlayEvent() {
        presenter.videoState = presenter.VIDEO_STATE.PLAYING;
        presenter.addClassToView('playing');
    }

    function setVideoStateOnPauseEvent() {
        if (!presenter.isHideExecuted) {
            presenter.videoState = presenter.VIDEO_STATE.PAUSED;
            presenter.removeClassFromView('playing');
        }

        delete presenter.isHideExecuted;
    }

    presenter.removeMathJaxHook = function() {
        MathJax.Hub.signal.hooks["End Process"].Remove(presenter.mathJaxHook);
    };

    presenter.destroy = function() {
        if (presenter.controlBar !== null) {
            presenter.controlBar.destroy();
        }
        presenter.videoView.removeEventListener('DOMNodeRemoved', presenter.destroy);
        presenter.videoObject.removeEventListener('click', presenter.stopPropagationOnClickEvent);
        presenter.videoObject.removeEventListener('loadedmetadata', presenter.setMetaDataOnMetaDataLoadedEvent);
        presenter.videoObject.removeEventListener('play', setVideoStateOnPlayEvent);
        presenter.videoObject.removeEventListener('pause', setVideoStateOnPauseEvent);
        presenter.videoObject.removeEventListener('stalled', presenter.onStalledEventHandler);
        presenter.videoObject.removeEventListener('webkitfullscreenchange', fullScreenChange);
        $(document).off('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange');
        document.removeEventListener("mozfullscreenchange", fullScreenChange);

        presenter.$videoObject.unbind("ended");
        presenter.$videoObject.unbind("error");
        presenter.$videoObject.unbind("canplay");
        presenter.$videoObject.unbind('timeupdate');

        presenter.removeMathJaxHook();
        presenter.$view.off();

        presenter.videoObject.src = '';
        presenter.mathJaxHook = null;
        presenter.eventBus = null;
        presenter.view = null;
        presenter.viewObject = null;
        presenter.videoObject = null;
    };

    presenter.resizeVideoToWindow = function () {
        var body = document.getElementsByTagName('body')[0];

        var video = presenter.videoContainer.get(0);
        presenter.stylesBeforeFullscreen.actualTime = presenter.videoObject.currentTime;
        presenter.stylesBeforeFullscreen.style = {
            position: video.style.position,
            top: video.style.top,
            left: video.style.left,
            zIndex: video.style.zIndex,
            className: video.className
        };

        presenter.stylesBeforeFullscreen.changedStyles = true;
        video.style.position = "fixed";
        video.style.top = "0";
        video.style.left = "0";
        video.style.zIndex = 20000;
        video.className = video.className + " " + presenter.$view[0].className;
        body.appendChild(video);
        presenter.metadadaLoaded = false;
        presenter.videoObject.load();
        presenter.scaleCaptionsContainerToVideoNewVideoSize();
    };

    presenter.fullScreen = function () {
        var requestMethod = requestFullscreen(presenter.videoContainer);
        presenter.stylesBeforeFullscreen.moduleWidth = presenter.$view.width();
        presenter.stylesBeforeFullscreen.moduleHeight = presenter.$view.height();
        if (requestMethod === null) {
            presenter.resizeVideoToWindow();
        } else {
            presenter.scaleCaptionsContainerToScreenSize();
        }

        presenter.configuration.isFullScreen = true;
        fullScreenChange();

    };

    presenter.closeFullscreen = function () {
        if (presenter.stylesBeforeFullscreen.changedStyles === true) {
            presenter.stylesBeforeFullscreen.actualTime = presenter.videoObject.currentTime;
            presenter.stylesBeforeFullscreen.changedStyles = false;
            var video = presenter.videoContainer.get(0);
            presenter.videoView.appendChild(video);
            presenter.metadadaLoaded = false;
            presenter.videoObject.load();
            video.style.position = presenter.stylesBeforeFullscreen.style.position;
            video.style.top = presenter.stylesBeforeFullscreen.style.top;
            video.style.left = presenter.stylesBeforeFullscreen.style.left;
            video.style.zIndex = presenter.stylesBeforeFullscreen.style.zIndex;
            video.className = presenter.stylesBeforeFullscreen.style.className;
        } else {
            exitFullscreen();
        }
        presenter.configuration.isFullScreen = false;
        presenter.removeScaleFromCaptionsContainer();
        fullScreenChange();
    };

    presenter.keyboardController = function(keycode) {

        $(document).on('keydown', function(e) {
            e.preventDefault();
            $(this).off('keydown');
        });

        function increasedVolume() {
            var val = Math.round((presenter.videoObject.volume + 0.1)*10)/10;

            return val > 1 ? 1 : val;
        }
        
        function decreasedVolume() {
            var val = Math.round((presenter.videoObject.volume - 0.1)*10)/10;

            return val < 0 ? 0 : val;
        }
        
        function forward() {
            presenter.videoObject.currentTime += 15;
        }
        
        function backward() {
            presenter.videoObject.currentTime -= 15;
        }

        function playPause() {
            if (presenter.videoObject.paused) {
                presenter.play();
            } else {
                presenter.pause();
            }
        }

        switch(keycode) {
            case 32:
                playPause();
                break;
            case 38:
                presenter.videoObject.volume = increasedVolume();
                break;
            case 40:
                presenter.videoObject.volume = decreasedVolume();
                break;
            case 37:
                backward();
                break;
            case 39:
                forward();
                break;
            case 27:
                presenter.pause();
                break;
            case 70:
                presenter.fullScreen();
                break;
        }
    };

    presenter.validateFile = function (file) {
        var fileToReturn = {
            "Ogg video": file['Ogg video'],
            "MP4 video": file['MP4 video'],
            "WebM video": file['WebM video'],
            "Subtitles": file['Subtitles'],
            "Poster": file['Poster'],
            "ID": file['ID'],
            "Loop video": ModelValidationUtils.validateBoolean(file['Loop video'])
        };

        return  {
            isValid: true,
            file: fileToReturn
        };

    };

    presenter.validateFiles = function (model) {
        var modelFiles = model.Files;
        var files = [];

        for (var i = 0; i < modelFiles.length; i++) {
            files.push(presenter.validateFile(modelFiles[i]).file);
        }

        return {
            isValid: true,
            files: files
        };
    };

    presenter.validateModel = function (model) {
        return {
            isValid: true,
            addonSize: {
                width: parseInt(model.Width, 10),
                height: parseInt(model.Height, 10)
            },
            addonID: model.ID,
            isVisibleByDefault: ModelValidationUtils.validateBoolean(model["Is Visible"]),
            shouldHideSubtitles: ModelValidationUtils.validateBoolean(model["Hide subtitles"]),
            defaultControls: !ModelValidationUtils.validateBoolean(model['Hide default controls']),
            files: presenter.validateFiles(model).files,
            height: parseInt(model.Height, 10)

        }
    };

    presenter.run = function(view, model) {
        var upgradedModel = presenter.upgradeModel(model);
        var validatedModel = presenter.validateModel(upgradedModel);
        presenter.configuration = $.extend(presenter.configuration, validatedModel);
        presenter.videoState = presenter.VIDEO_STATE.STOPPED;

        presenter.commandsQueue = CommandsQueueFactory.create(presenter);

        presenter.videoView = view;
        presenter.$view = $(view);

        presenter.videoContainer = $(view).find('.video-container:first');
        presenter.$captionsContainer = presenter.$view.find(".captions-container:first");

        presenter.videoObject = presenter.videoContainer.find('video')[0];
        presenter.$videoObject = $(presenter.videoObject);

        presenter.setDimensions();

        if (presenter.configuration.defaultControls) {
            presenter.buildControlsBars();
        }

        presenter.connectHandlers();
        presenter.reload();

        if (!presenter.configuration.isVisibleByDefault) {
            presenter.hide();
        }

        presenter.eventBus.addEventListener('ValueChanged', this);

        if (presenter.configuration.shouldHideSubtitles) {
            presenter.hideSubtitles();
        } else {
            presenter.showSubtitles();
        }

    };

    presenter.connectHandlers = function () {
        presenter.videoObject.addEventListener('click', presenter.stopPropagationOnClickEvent);
        presenter.videoObject.addEventListener('error', function() { presenter.handleErrorCode(this.error); }, true);
        presenter.videoObject.addEventListener('loadedmetadata', presenter.setMetaDataOnMetaDataLoadedEvent);
        presenter.videoObject.addEventListener('play', setVideoStateOnPlayEvent);
        presenter.videoObject.addEventListener('pause', setVideoStateOnPauseEvent);
        presenter.videoObject.addEventListener('playing', presenter.onVideoPlaying, false);

        $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', presenter.fullscreenChangedEventReceived);

        presenter.videoView.addEventListener('DOMNodeRemoved', function onDOMNodeRemoved(ev) {
            if (ev.target === this) {
                presenter.destroy();
            }
        });
    };

    presenter.fullscreenChangedEventReceived = function () {
        if (!isVideoInFullscreen() && presenter.configuration.isFullScreen){
            presenter.configuration.isFullScreen = false;
            presenter.removeScaleFromCaptionsContainer();
            fullScreenChange();
            presenter.controlBar.showFullscreenButton();
        }
    };

    presenter.checkAddonSize = function () {
        if (presenter.videoContainer.width() !== presenter.lastWidthAndHeightValues.width
            || presenter.videoContainer.height() !== presenter.lastWidthAndHeightValues.height) {

            presenter.lastWidthAndHeightValues.width = presenter.videoContainer.width();
            presenter.lastWidthAndHeightValues.height = presenter.videoContainer.height();

            presenter.calculateCaptionsOffset(presenter.lastWidthAndHeightValues, false);
            presenter.scaleCaptionsContainerToVideoNewVideoSize();
        }
    };

    presenter.buildControlsBars = function () {
        var config = {
            videoObject: presenter.videoObject,
            parentElement: presenter.videoContainer[0]
        };

        var controls = new window.CustomControlsBar(config);

        controls.addPlayCallback(presenter.play);
        controls.addPauseCallback(presenter.pause);
        controls.addStopCallback(presenter.stop);
        controls.addFullscreenCallback(presenter.fullScreen);
        controls.addCloseFullscreenCallback(presenter.closeFullscreen);
        controls.addProgressChangedCallback(presenter.seekFromPercent);
        controls.addVolumeChangedCallback(presenter.setVolume);
        controls.addCallbackToBuildInTimer(presenter.checkAddonSize);

        presenter.$view.find('.video-container').append(controls.getMainElement());

        presenter.controlBar = controls;
    };

    presenter.scaleCaptionsContainerToVideoNewVideoSize = presenter.metadataLoadedDecorator(function () {
        var size = {
            width: $(presenter.videoObject).width(),
            height: $(presenter.videoObject).height()
        };

        var newVideoSize = presenter.getVideoSize(size, presenter.videoObject);

        var xScale = newVideoSize.width / presenter.originalVideoSize.width;
        var yScale = newVideoSize.height / presenter.originalVideoSize.height;

        presenter.$captionsContainer.css(generateTransformDict(xScale, yScale));

        presenter.calculateCaptionsOffset(size, false);
    });

    presenter.scaleCaptionsContainerToScreenSize = presenter.metadataLoadedDecorator(function () {
        console.log("Scale");
        var size = {
            width: screen.width,
            height: screen.height
        };

        var newVideoSize = presenter.getVideoSize(size, presenter.videoObject);

        var xScale = newVideoSize.width / presenter.originalVideoSize.width;
        var yScale = newVideoSize.height / presenter.originalVideoSize.height;


        presenter.$captionsContainer.css(generateTransformDict(xScale, yScale));

        presenter.calculateCaptionsOffset(size, false);
    });

    presenter.removeScaleFromCaptionsContainer = presenter.metadataLoadedDecorator(function () {
        presenter.$captionsContainer.css(generateTransformDict(1, 1));

        presenter.calculateCaptionsOffset(presenter.configuration.addonSize, false);
    });

    presenter.sendOnPLayingEvent = function () {
        var eventData = {
            'source': presenter.configuration.addonID,
            'item': (presenter.currentMovie + 1),
            'value': 'playing',
            'score': ''
        };

        presenter.eventBus.sendEvent('ValueChanged', eventData);
    };

    presenter.onVideoPlaying = function AddonVideo_onVideoPlaying () {
        presenter.sendOnPlayingEvent();

        if (presenter.videoObject.currentTime === 0){
            presenter.sendTimeUpdateEvent(presenter.formatTime(presenter.videoObject.currentTime))
        }
    };

    presenter.convertTimeStringToNumber = function(timeString) {
        timeString = timeString.split(':');
        var minutes = parseInt(timeString[0] * 60, 10);
        var seconds = parseInt(timeString[1], 10);
        return { isCorrect: true, value: (minutes + seconds) };
    };

    presenter.handleErrorCode = function(error) {
        if (!error) return;

        presenter.$view.html(presenter.getVideoErrorMessage(error.code));
    };

    presenter.createPreview = function(view, model) {
        presenter.isPreview = true;

        var upgradedModel = presenter.upgradeModel(model);
        var validatedModel = presenter.validateModel(upgradedModel);
        presenter.configuration = $.extend(presenter.configuration, validatedModel);

        presenter.$view = $(view);
        presenter.videoContainer = $(view).find('.video-container:first');

        presenter.setVideo();
        presenter.setDimensions();

        presenter.isCurrentlyVisible = true;
        if (!presenter.configuration.isVisibleByDefault) {
            presenter.hide();
        }
    };

    presenter.showCaptions = function(time) {
        if (!presenter.configuration.dimensions) return; // No captions to show when video wasn't loaded properly
        for (var i = 0; i < presenter.captions.length; i++) {
            var caption = presenter.captions[i];
            if (caption.start <= time && caption.end >= time) {
                $(caption.element).attr('visibility', 'visible');
                $(caption.element).css('visibility', presenter.isCurrentlyVisible ? 'visible' : 'hidden');
            } else {
                $(caption.element).css('visibility', 'hidden');
                $(caption.element).attr('visibility', 'hidden');
            }
        }
    };

    presenter.reload = function() {
        presenter.isVideoLoaded = false;
        $(presenter.videoContainer).find('.captions').remove();
        presenter.setVideo();
        presenter.loadSubtitles();
        $(presenter.videoObject).unbind('timeupdate');
        $(presenter.videoObject).bind("timeupdate", function () {
            onTimeUpdate(this);
        });
        presenter.removeClassFromView('playing');
    };

    presenter.sendTimeUpdate = function Video_sendTime() {
        var actualVideoTime = parseInt(presenter.videoObject.currentTime, 10);
        if (actualVideoTime !== presenter.lastSentCurrentTime) {
            var formattedTime = presenter.formatTime(actualVideoTime,10);
            presenter.sendTimeUpdateEvent(formattedTime);
            presenter.lastSentCurrentTime = actualVideoTime;
        }
    };

    function onTimeUpdate(video) {
        presenter.showCaptions(presenter.videoObject.currentTime);

        var currentTime = Math.round(video.currentTime * 10) / 10,
          videoDuration = Math.round(video.duration * 10) / 10,
          isFullScreen = document.mozFullScreen || document.webkitIsFullScreen;

        if (currentTime >= videoDuration) {
            presenter.sendVideoEndedEvent();
            presenter.reload();

            if (isFullScreen && document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }

            if (presenter.configuration.isFullScreen) {
                fullScreenChange();
            }
        }
    }

    presenter.getState = function() {
        var isPaused = presenter.videoObject.paused;
        presenter.videoObject.pause();
        return JSON.stringify({
            currentTime : presenter.videoObject.currentTime,
            isCurrentlyVisible : presenter.isCurrentlyVisible,
            isPaused: isPaused,
            currentMovie: presenter.currentMovie,
            areSubtitlesHidden: presenter.areSubtitlesHidden
        });
    };

    presenter.setState = function(stateString) {
        if (ModelValidationUtils.isStringEmpty(stateString)) return;
        var state = JSON.parse(stateString);
        var currentTime = state.currentTime;
        presenter.isCurrentlyVisible = state.isCurrentlyVisible;

        if (presenter.isCurrentlyVisible !== (presenter.$view.css('visibility') !== 'hidden')) {
            presenter.setVisibility(presenter.isCurrentlyVisible);
        }

        presenter.currentMovie = state.currentMovie;
        presenter.reload();

        $(presenter.videoObject).on('canplay', function onVideoCanPlay() {
            if (presenter.currentTime < currentTime) {
                presenter.currentTime = currentTime;
                presenter.startTime = currentTime;
                presenter.videoState = presenter.VIDEO_STATE.PAUSED;
                $(this).off('canplay');
            }

            if(state.areSubtitlesHidden != undefined) {
                if (state.areSubtitlesHidden) {
                    presenter.hideSubtitles();
                } else {
                    presenter.showSubtitles();
                }
            }
        });
    };

    presenter.getIOSVersion = function(userAgent) {
        var match = /CPU OS ([\d_]+) like Mac OS X/.exec(userAgent);
        return match === null ? '' : match[1];
    };

    presenter.addAttributePoster = function(video, posterSource) {
        if (posterSource) {
            if (!MobileUtils.isSafariMobile(navigator.userAgent)) {
                if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1){
                    var tmpVideo = video;
                    video.remove();
                    $(tmpVideo).attr('poster', '');
                    $(tmpVideo).attr('poster', posterSource);
                    presenter.videoContainer.append(tmpVideo);
                }else{
                    video.attr('poster', '');
                    video.attr('poster', posterSource);
                }
                return;
            }


            var $poster_wrapper = $('<div>');
            $poster_wrapper.addClass('poster-wrapper');
            $poster_wrapper.on('click', function onPosterWrapperClick(e) {
                e.stopPropagation();
                $(this).remove();
                presenter.videoObject.play();
            });

            var $poster = $('<img>');
            $poster.attr('src', posterSource);
            $poster_wrapper.append($poster);

            var $playBTN = $('<div>');
            $playBTN.addClass('video-poster-play');
            $poster_wrapper.append($playBTN);

            video.parent().append($poster_wrapper);

        } else {
            video.attr('poster', '');
            presenter.$view.find('.poster-wrapper').remove();
        }
    };

    presenter.setVideo = function() {
        if (presenter.videoObject) {
            $(presenter.videoObject).unbind("ended");
            $(presenter.videoObject).unbind("error");
            $(presenter.videoObject).unbind("canplay");

            presenter.videoObject.pause();
        }
        this.videoContainer.find('source').remove();
        presenter.videoObject = presenter.videoContainer.find('video')[0];
        presenter.videoState = presenter.VIDEO_STATE.STOPPED;
        var $video = $(presenter.videoObject);
        var files = presenter.configuration.files;
        this.addAttributePoster($video, files[presenter.currentMovie].Poster);
        if (presenter.isPreview) {
            $video.attr('preload', 'none');
        } else {
            $video.attr('preload', 'auto');
            for (var vtype in presenter.videoTypes) {
                if (files[presenter.currentMovie][this.videoTypes[vtype].name] && presenter.videoObject.canPlayType(presenter.videoTypes[vtype].type)) {
                    var source = $('<source>');
                    source.attr('type', this.videoTypes[vtype].type);
                    source.attr('src', files[presenter.currentMovie][presenter.videoTypes[vtype].name]);
                    $video.append(source);
                }
            }

            // "ended" event doesn't work on Safari
            $(presenter.videoObject).unbind('timeupdate');
            $(presenter.videoObject).bind("timeupdate", function onTimeUpdate() {
                onTimeUpdate(this);
            });

            $(presenter.videoObject).bind("error", function onError() {
                $(this).unbind("error");
                presenter.reload();
                if (presenter.configuration.isFullScreen) {
                    fullScreenChange();
                }
            });

            $(presenter.videoObject).bind("canplay", function onCanPlay() {
                presenter.isVideoLoaded = true;

                if (!presenter.commandsQueue.isQueueEmpty()) {
                    presenter.commandsQueue.executeAllTasks();
                }

                $(this).unbind("canplay");

                if (presenter.areSubtitlesHidden) {
                    presenter.hideSubtitles();
                } else {
                    presenter.showSubtitles();
                }
            });
            // Android devices have problem with loading content.
            presenter.videoObject.addEventListener("stalled", presenter.onStalledEventHandler, false);
            presenter.videoObject.load();
            presenter.metadadaLoaded = false;

            if(files[presenter.currentMovie]['Loop video']) {
                if (typeof presenter.videoObject.loop == 'boolean') {
                    presenter.videoObject.loop = true;
                } else {
                    $(presenter.videoObject).on('ended', function () {
                        presenter.currentTime = 0;
                        presenter.play();
                    }, false);
                }

                presenter.isAborted = false;

                $(presenter.videoObject).on('abort', function() {
                    presenter.isAborted = true;
                });

                $(presenter.videoObject).on('canplay', function() {
                    if(presenter.isAborted) {
                        presenter.play();
                    }
                });
            }
        }
    };

    /**
     * Creates DIV element containing caption text.
     *
     * @param caption - used text, top and left properties
     * @return reference do newly created element
     */
    function createCaptionElement(caption) {
        var captionElement = document.createElement('div');

        $(captionElement).addClass('captions');
        $(captionElement).addClass(caption.cssClass);
        $(captionElement).html(caption.text);
        $(captionElement).css({
            top: caption.top,
            left: caption.left
        });

        $(captionElement).css('visibility', 'hidden');
        $(captionElement).attr('visibility', 'hidden');
        presenter.$captionsContainer.append(captionElement);

        return captionElement;
    }

    presenter.convertLinesToCaptions = function(lines) {
        presenter.captions = [];

        for (var i = 0; i < lines.length; i++) {
            var parts = lines[i].split('|');
            if (parts.length == 6) {
                var caption = {
                    start:parts[0],
                    end:parts[1],
                    top:(StringUtils.endsWith(parts[2], 'px') ? parts[2] : parts[2] + 'px'),
                    left:(StringUtils.endsWith(parts[3], 'px') ? parts[3] : parts[3] + 'px'),
                    cssClass:parts[4],
                    text:parts[5]
                };

                caption.element = createCaptionElement(caption);
                presenter.captions.push(caption);

                presenter.captionDivs.push(caption.element);
            }
        }
    };

    presenter.loadSubtitles = function() {
        var subtitlesLoadedDeferred = new $.Deferred(),
          subtitles = presenter.configuration.files[presenter.currentMovie].Subtitles;

        if (subtitles) {
            if (StringUtils.startsWith(subtitles, "/file")) {
                $.get(subtitles, function(data) {
                    subtitlesLoadedDeferred.resolve(data);
                });
            } else {
                subtitlesLoadedDeferred.resolve(subtitles);
            }

            presenter.convertLinesToCaptions(Helpers.splitLines(subtitles));
            $.when(subtitlesLoadedDeferred.promise(), presenter.mathJaxProcessEnded, presenter.pageLoaded).then(function onSubtitlesLoaded(data) {
                presenter.convertLinesToCaptions(Helpers.splitLines(data));
                MathJax.Hub.Queue(["Typeset", MathJax.Hub, presenter.captionDivs])();
            });
        }
    };

    presenter.calculateVideoContainerHeight = function ($container, moduleHeight) {
        var borderBottom = $container.css('border-bottom-width'),
          borderTop = $container.css('border-top-width'),
          marginTop = $container.css('margin-top'),
          marginBottom = $container.css('margin-bottom');

        if (ModelValidationUtils.isStringEmpty(borderTop)) borderTop = "0px";
        if (ModelValidationUtils.isStringEmpty(borderBottom)) borderBottom = "0px";
        if (ModelValidationUtils.isStringEmpty(marginTop)) marginTop = "0px";
        if (ModelValidationUtils.isStringEmpty(marginBottom)) marginBottom = "0px";

        return moduleHeight - parseInt(borderBottom, 10) -
          parseInt(borderTop, 10) -
          parseInt(marginTop, 10) -
          parseInt(marginBottom, 10);
    };

    presenter.setDimensions = function() {
        var video = presenter.getVideo();

        presenter.videoContainer.css('height',  presenter.calculateVideoContainerHeight(presenter.videoContainer, presenter.configuration.height) + 'px');

        video.css("width", "100%")
          .attr('height', presenter.videoContainer.height());

        presenter.configuration.dimensions = {
            video:{
                width:$(video).width(),
                height:$(video).height()
            },
            container:{
                width:$(presenter.videoContainer).width(),
                height:$(presenter.videoContainer).height()
            }
        };
    };

    presenter.showSubtitles = function () {
        presenter.$view.find('.captions').show();
        presenter.areSubtitlesHidden = false;
    };

    presenter.hideSubtitles = function () {
        presenter.$view.find('.captions').hide();
        presenter.areSubtitlesHidden = true;
    };

    presenter.executeCommand = function(name, params) {
        var commands = {
            'show': presenter.show,
            'hide': presenter.hide,
            'next': presenter.next,
            'previous': presenter.previous,
            'jumpTo': presenter.jumpToCommand,
            'jumpToID': presenter.jumpToIDCommand,
            'seek': presenter.seekCommand,
            'play' : presenter.play,
            'stop' : presenter.stop,
            'showSubtitles' : presenter.showSubtitles,
            'hideSubtitles' : presenter.hideSubtitles
        };

        Commands.dispatch(commands, name, params, presenter);
    };

    presenter.setVisibility = function(isVisible) {
        presenter.$view.css("visibility", isVisible ? "visible" : "hidden");

        var $captions = presenter.$view.find('.captions');
        if (!isVisible) {
            $captions.each(function hideVisibility() {
                $(this).css('visibility', 'hidden');
            });
        } else {
            $captions.each(function showVisibility() {
                if ($(this).attr('visibility') === 'visible') {
                    $(this).css('visibility', 'visible');
                }
            });
        }
    };

    presenter.seek = function (seconds) {
        if (!presenter.isVideoLoaded) {
            presenter.commandsQueue.addTask('seek', [seconds]);
            return;
        }

        presenter.videoObject.currentTime = seconds;
    };

    presenter.seekFromPercent = function (percent) {
        presenter.seek(presenter.videoObject.duration * (percent / 100));
    };

    presenter.seekCommand = function(params) {
        presenter.seek(params[0]);
    };

    presenter.show = function() {
        if (presenter.isCurrentlyVisible) return;
        if(presenter.VIDEO_STATE.PLAYING == presenter.videoState) {
            presenter.videoObject.play();
        }
        presenter.isCurrentlyVisible = true;
        presenter.setVisibility(true);
    };

    presenter.hide = function() {
        if (!presenter.isCurrentlyVisible) return;

        if (presenter.VIDEO_STATE.PLAYING == presenter.videoState) {
            presenter.videoObject.pause();
            presenter.videoState = presenter.VIDEO_STATE.PLAYING;
            presenter.isHideExecuted = true;
        }
        presenter.isCurrentlyVisible = false;
        presenter.setVisibility(false);
    };

    presenter.jumpTo = function(movieNumber) {
        var newMovie = parseInt(movieNumber, 10) - 1;
        if (0 <= newMovie && newMovie < presenter.configuration.files.length) {
            presenter.currentMovie = newMovie;
            presenter.reload();
        }
    };

    presenter.jumpToCommand = function (params) {
        presenter.jumpTo(params[0]);
    };

    presenter.jumpToID = function(id) {
        for (var i = 0; i < presenter.configuration.files.length; i++) {
            if (id === presenter.configuration.files[i].ID) {
                presenter.jumpTo(i + 1);  // Video numbers are counted from 1 to n
                break;
            }
        }
    };

    presenter.jumpToIDCommand = function (params) {
        presenter.jumpToID(params[0]);
    };

    presenter.onStalledEventHandler = function () {
        var video = this;

        if (!presenter.commandsQueue.isQueueEmpty() && video.readyState >= 2) {
            presenter.isVideoLoaded = true;
            presenter.commandsQueue.executeAllTasks();
        }
    };

    presenter.removeWaterMark = function () {
        presenter.$view.find('.poster-wrapper').remove();
    };

    presenter.loadVideoAtPlayOnMobiles = function () {
        if (MobileUtils.isSafariMobile(navigator.userAgent)) {
            if(!presenter.isVideoLoaded) {
                presenter.videoObject.load();
                presenter.metadadaLoaded = false;
            }
        }
    };

    presenter.addClassToView = function (className) {
        presenter.$view.addClass(className);
    };

    presenter.removeClassFromView = function (className) {
        presenter.$view.removeClass(className);
    };

    presenter.play = function () {
        presenter.removeWaterMark();
        presenter.loadVideoAtPlayOnMobiles();
        if (!presenter.isVideoLoaded) {
            presenter.commandsQueue.addTask('play', []);
            return;
        }

        if (presenter.videoObject.paused) {
            presenter.videoObject.play();
            presenter.addClassToView('playing');
        }
    };

    presenter.stop = function () {
        if (!presenter.isVideoLoaded) {
            presenter.commandsQueue.addTask('stop', []);
            return;
        }

        if (!presenter.videoObject.paused) {
            presenter.seek(0); // sets the current time to 0
            presenter.videoObject.pause();
            presenter.removeClassFromView('playing');
        }
    };

    presenter.pause = function () {
        if (!presenter.isVideoLoaded) {
            presenter.commandsQueue.addTask('pause', []);
            return;
        }

        if (!presenter.videoObject.paused) {
            presenter.videoObject.pause();
            presenter.removeClassFromView('playing');
        }
    };

    presenter.previous = function() {
        if (presenter.currentMovie > 0) {
            presenter.currentMovie--;
            presenter.reload();
        }
    };

    presenter.next = function() {
        if (presenter.currentMovie < presenter.configuration.files.length - 1) {
            presenter.currentMovie++;
            presenter.reload();
        }
    };

    presenter.setVolume = function (percent) {
        presenter.videoObject.volume = percent/100;
    };

    presenter.reset = function() {
        presenter.configuration.isVisibleByDefault ? presenter.show() : presenter.hide();
        presenter.videoState = presenter.VIDEO_STATE.STOPPED;
        presenter.currentMovie = 0;
        if (presenter.metadadaLoaded) {
            presenter.videoObject.pause();
        }

        presenter.reload();

        if (presenter.configuration.shouldHideSubtitles) {
            presenter.hideSubtitles();
        } else {
            presenter.showSubtitles();
        }
    };

    presenter.getVideo = function() {
        return presenter.videoContainer.find('video:first');
    };

    function generateTransformDict(scaleX, scaleY) {
        var scale = "scale(" + scaleX + "," + scaleY + ")";
        return {
            'transform': scale,
            '-ms-transform': scale,
            '-webkit-transform': scale,
            '-o-transform': scale,
            '-moz-transform': scale,
            "-webkit-transform-origin": "top left",
            "-ms-transform-origin": "top left",
            "transform-origin": "top left"
        }
    }

    function requestFullscreen ($element) {
        var DomElement = $element.get(0);

        var requestMethod = DomElement.requestFullscreen || DomElement.mozRequestFullScreen ||
          DomElement.msRequestFullscreen || DomElement.webkitRequestFullScreen ||
          DomElement.webkitEnterFullscreen || null;
        if (requestMethod) {
            requestMethod.call(DomElement);
        }
        return requestMethod;
    }

    function exitFullscreen () {
        var exitMethod = document.exitFullscreen || document.mozCancelFullScreen ||
          document.msExitFullscreen || document.webkitExitFullscreen || null;

        if (exitMethod) {
            exitMethod.call(document);
        }
    }

    function isVideoInFullscreen() {
        if (document.fullscreenElement
            || document.mozFullScreenElement
            || document.webkitFullscreenElement
            || document.msFullscreenElement
            || document.webkitCurrentFullScreenElement
            || document.fullscreen
            || document.webkitIsFullScreen
            || document.mozFullScreen) {
            return true;
        }

        return false;
    }

    return presenter;
}