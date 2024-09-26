'use strict';

angular.module('bahmni.registration')
    .service('patientServiceStrategy', ['$http', '$q', '$rootScope', 'messagingService', function ($http, $q, $rootScope, messagingService) {
        var openmrsUrl = Bahmni.Registration.Constants.openmrsUrl;
        var baseOpenMRSRESTURL = Bahmni.Registration.Constants.baseOpenMRSRESTURL;

        var search = function (config) {
            var defer = $q.defer();
            var patientSearchUrl = Bahmni.Common.Constants.bahmniSearchUrl + "/patient";
            if (config && config.params.identifier) {
                patientSearchUrl = Bahmni.Common.Constants.bahmniSearchUrl + "/patient/lucene";
            }
            var onResults = function (result) {
                defer.resolve(result);
            };
            $http.get(patientSearchUrl, config).success(onResults)
                .error(function (error) {
                    defer.reject(error);
                });
            return defer.promise;
        };

        var getByUuid = function (uuid) {
            var url = openmrsUrl + "/ws/rest/v1/patientprofile/" + uuid;
            var config = {
                method: "GET",
                params: {v: "full"},
                withCredentials: true
            };

            var defer = $q.defer();
            $http.get(url, config).success(function (result) {
                defer.resolve(result);
            });
            return defer.promise;
        };

        var create = function (patient, jumpAccepted) {
            var deferred = $q.defer();
            var nhisNumber = patient['NHIS Number'];
            if (nhisNumber != null) {
                getValid(nhisNumber).then(function (response) {
                    if (response.data.givenName) {
                        getUnique(nhisNumber).then(function (response) {
                            if (response.data) {
                                parientCreation(patient, jumpAccepted, deferred);
                            } else {
                                messagingService.showMessage("error", "NHIS NUMBER ALREADY USED");
                                deferred.resolve();
                            }
                        });
                    } else {
                        messagingService.showMessage("error", "NHIS NUMBER IS NOT VALID");
                        deferred.resolve();
                    }
                }).catch(function (error) {
                    console.log(error);
                    messagingService.showMessage("error", "No Internet connection Please Proceed without NHIS Number");
                    deferred.resolve();
                });
            } else {
                parientCreation(patient, jumpAccepted, deferred);
            }
            return deferred.promise;
        };

        var parientCreation = function (patient, jumpAccepted, deferred) {
            var data = new Bahmni.Registration.CreatePatientRequestMapper(moment()).mapFromPatient($rootScope.patientConfiguration.attributeTypes, patient);
            var url = baseOpenMRSRESTURL + "/bahmnicore/patientprofile";
            var config = {
                withCredentials: true,
                headers: {"Accept": "application/json", "Content-Type": "application/json", "Jump-Accepted": jumpAccepted}
            };
            $http.post(url, data, config).then(function (response) {
                deferred.resolve(response);
            }, function (reason) {
                deferred.resolve(reason);
            });
        };

        var update = function (patient, openMRSPatient, attributeTypes) {
            var deferred = $q.defer();
            var nhisNumber = patient['NHIS Number'];
            var patientUuid = patient['uuid'];
            if (nhisNumber != null) {
                getValid(nhisNumber).then(function (response) {
                    if (response.data.givenName) {
                        getUniqueUpdate(nhisNumber, patientUuid).then(function (response) {
                            if (response.data) {
                                patientUpdate(patient, openMRSPatient, attributeTypes, deferred);
                            } else {
                                messagingService.showMessage("error", "NHIS NUMBER ALREADY USED");
                                deferred.resolve();
                            }
                        });
                    } else {
                        messagingService.showMessage("error", "NHIS NUMBER IS NOT VALID");
                        deferred.resolve();
                    }
                }).catch(function (error) {
                    console.log(error);
                    messagingService.showMessage("error", "No Internet connection Please Proceed without NHIS Number");
                    deferred.resolve();
                });
            } else {
                patientUpdate(patient, openMRSPatient, attributeTypes, deferred);
            }
            return deferred.promise;
        };

        var patientUpdate = function (patient, openMRSPatient, attributeTypes, deferred) {
            var data = new Bahmni.Registration.UpdatePatientRequestMapper(moment()).mapFromPatient(attributeTypes, openMRSPatient, patient);
            var url = baseOpenMRSRESTURL + "/bahmnicore/patientprofile/" + openMRSPatient.uuid;
            var config = {
                withCredentials: true,
                headers: {"Accept": "application/json", "Content-Type": "application/json"}
            };
            $http.post(url, data, config).then(function (result) {
                deferred.resolve(result);
            }, function (reason) {
                deferred.resolve(reason);
            });
        };
        var generateIdentifier = function (patient) {
            var data = {"identifierSourceName": patient.identifierPrefix ? patient.identifierPrefix.prefix : ""};
            var url = openmrsUrl + "/ws/rest/v1/idgen";
            var config = {
                withCredentials: true,
                headers: {"Accept": "text/plain", "Content-Type": "application/json"}
            };
            return $http.post(url, data, config);
        };

        var getValid = function (nhisNumber) {
            return $http.get(Bahmni.Common.Constants.validUrl + '/' + nhisNumber, {
                withCredentials: true
            });
        };
        var getUniqueUpdate = function (nhisNumber, patientUuid) {
            return $http.get(Bahmni.Common.Constants.uniqueUrl + '/' + nhisNumber + '/' + patientUuid, {
                withCredentials: true
            });
        };
        var getUnique = function (nhisNumber) {
            return $http.get(Bahmni.Common.Constants.uniqueUrl + '/' + nhisNumber, {
                withCredentials: true
            });
        };

        return {
            search: search,
            get: getByUuid,
            create: create,
            update: update,
            generateIdentifier: generateIdentifier,
            getValid: getValid,
            getUnique: getUnique
        };
    }]);
