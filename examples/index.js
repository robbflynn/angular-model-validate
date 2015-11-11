angular.module('model-validate', ['modelValidate'])
  .controller("ExampleController", function($scope) {
    $scope.data = {}

    $scope.func1 = function() {
      return false
    }

    $scope.func2 = function() {
      return false
    }

    $scope.submit = function() {
      console.log("submit", $scope.myForm.$modelValidate.models)
    }

    $scope.reset = function() {
      $scope.myForm.$modelValidate.reset()
      console.log("reset", $scope.data, $scope.myForm)
    }
  })