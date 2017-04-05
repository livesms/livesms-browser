$(document).ready(() => {

	var qrcode = new QRCode("qrcode");

	$("input").on("input", () => {
		qrcode.makeCode({
			text        : "http://jindo.dev.naver.com/collie",
			width       : 128,
			height      : 128,
			colorDark   : "#000000",
			colorLight  : "#ffffff",
			correctLevel: QRCode.CorrectLevel.H
		});
	})

});