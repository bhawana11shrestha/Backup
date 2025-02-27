'use strict';

angular.module('bahmni.common.conceptSet')
    .directive('concept', ['RecursionHelper', 'spinner', '$filter', 'messagingService', 'appService',
        function (RecursionHelper, spinner, $filter, messagingService, appService) {
            var link = function (scope) {
                scope.displayNepaliDates = appService.getAppDescriptor().getConfigValue('displayNepaliDates');
                scope.enableNepaliCalendar = appService.getAppDescriptor().getConfigValue('enableNepaliCalendar');

                var hideAbnormalbuttonConfig = scope.observation && scope.observation.conceptUIConfig && scope.observation.conceptUIConfig['hideAbnormalButton'];

                scope.now = moment().format("YYYY-MM-DD hh:mm:ss");
                scope.showTitle = scope.showTitle === undefined ? true : scope.showTitle;
                scope.hideAbnormalButton = hideAbnormalbuttonConfig == undefined ? scope.hideAbnormalButton : hideAbnormalbuttonConfig;

                scope.cloneNew = function (observation, parentObservation) {
                    observation.showAddMoreButton = function () {
                        return false;
                    };
                    var newObs = observation.cloneNew();
                    newObs.scrollToElement = true;
                    var index = parentObservation.groupMembers.indexOf(observation);
                    parentObservation.groupMembers.splice(index + 1, 0, newObs);
                    messagingService.showMessage("info", "A new " + observation.label + " section has been added");
                    scope.$root.$broadcast("event:addMore", newObs);
                };

                scope.removeClonedObs = function (observation, parentObservation) {
                    observation.voided = true;
                    var lastObservationByLabel = _.findLast(parentObservation.groupMembers, function (groupMember) {
                        return groupMember.label === observation.label && !groupMember.voided;
                    });

                    lastObservationByLabel.showAddMoreButton = function () { return true; };
                    observation.hidden = true;
                };

                scope.isClone = function (observation, parentObservation) {
                    if (parentObservation && parentObservation.groupMembers) {
                        var index = parentObservation.groupMembers.indexOf(observation);
                        return (index > 0) ? parentObservation.groupMembers[index].label == parentObservation.groupMembers[index - 1].label : false;
                    }
                    return false;
                };

                scope.isRemoveValid = function (observation) {
                    if (observation.getControlType() == 'image') {
                        return !observation.value;
                    }
                    return true;
                };

                scope.getStringValue = function (observations) {
                    return observations.map(function (observation) {
                        return observation.value + ' (' + $filter('bahmniDate')(observation.date) + ")";
                    }).join(", ");
                };

                scope.toggleSection = function () {
                    scope.collapse = !scope.collapse;
                };

                scope.isCollapsibleSet = function () {
                    return scope.showTitle == true;
                };

                scope.hasPDFAsValue = function () {
                    return scope.observation.value && (scope.observation.value.indexOf(".pdf") > 0);
                };

                scope.$watch('collapseInnerSections', function () {
                    scope.collapse = scope.collapseInnerSections && scope.collapseInnerSections.value;
                });

                scope.handleUpdate = function () {
                    scope.$root.$broadcast("event:observationUpdated-" + scope.conceptSetName, scope.observation.concept.name, scope.rootObservation);
                };

                scope.update = function (value) {
                    if (scope.getBooleanResult(scope.observation.isObservationNode)) {
                        scope.observation.primaryObs.value = value;
                    } else if (scope.getBooleanResult(scope.observation.isFormElement())) {
                        scope.observation.value = value;
                    }
                    scope.handleUpdate();
                };

                scope.getBooleanResult = function (value) {
                    return !!value;
                };
            };

            var compile = function (element) {
                return RecursionHelper.compile(element, link);
            };

            return {
                restrict: 'E',
                compile: compile,
                controller: ['$rootScope', '$scope', function ($rootScope, $scope) {
                    var alreadyAdded = false;
                    var listener;

                    function updateDate (test) {
                        if ($scope.observation.label == 'Expected delivery date') {
                            var engDate = test.englishDate;
                            var result = new Date(engDate);
                            if (!alreadyAdded) {
                                result.setDate(result.getDate() + 280);
                                alreadyAdded = true;
                            }
                            var str = result.toISOString().substr(0, 10);
                            test.englishDate = str;
                            $scope.observation.value = str;
                            var date = str.split("-");
                            var bsDate = calendarFunctions.getBsDateByAdDate(parseInt(date[0]), parseInt(date[1]), parseInt(date[2]));
                            var obsBsDate = calendarFunctions.bsDateFormat("%y-%m-%d", bsDate.bsYear, bsDate.bsMonth, bsDate.bsDate);
                            var nepaliDate = obsBsDate;
                            $scope.observation.nepaliDate = nepaliDate;
                            alreadyAdded = false;
                        }
                    }

                    listener = $rootScope.$on('menstrualToExpectedDateChanged', function (e, test) {
                        updateDate(test);
                    });

                    $scope.$on('$destroy', function () {
                        listener();
                    });
                }],
                scope: {
                    conceptSetName: "=",
                    observation: "=",
                    atLeastOneValueIsSet: "=",
                    showTitle: "=",
                    conceptSetRequired: "=",
                    rootObservation: "=",
                    patient: "=",
                    collapseInnerSections: "=",
                    rootConcept: "&",
                    hideAbnormalButton: "="
                },
                templateUrl: '../common/concept-set/views/observation.html'
            };
        }]);
