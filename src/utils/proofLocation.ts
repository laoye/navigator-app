import BackgroundGeolocation from 'react-native-background-geolocation';

export interface ProofLocation {
    latitude: number;
    longitude: number;
    /** 水平精度（米）。水印上会写成 +/-8m，让看照片的人知道这个坐标有多可信 */
    accuracy: number | null;
}

/** 定位等待上限（秒）。超时就当拿不到 —— 见下方说明 */
const TIMEOUT_SECONDS = 8;

/**
 * 取一次当前位置，供 POD 照片水印使用。
 *
 * **永远不抛异常，拿不到就返回 null。** 地库、电梯、室内仓库定位失败是常态，
 * 让司机因为没有 GPS 就传不上凭证，代价远大于少一条坐标 —— 服务端会在水印上
 * 写「GPS UNAVAILABLE」，运营也能从结构化字段看出这张照片没有定位。
 * 是否强制要求 GPS 是后台的一个开关，由服务端拦，不在这里判断。
 *
 * maximumAge 给 30 秒：司机拍照前多半刚在这个点停留过，复用一次近期定位
 * 比每次都冷启动 GPS 快得多，而 30 秒内人不会移动到影响取证的距离。
 */
export async function captureProofLocation(): Promise<ProofLocation | null> {
    try {
        const position = await BackgroundGeolocation.getCurrentPosition({
            timeout: TIMEOUT_SECONDS,
            maximumAge: 30000,
            desiredAccuracy: 10,
            samples: 1,
            persist: false,
            extras: { event: 'proofOfDelivery' },
        });

        const coords = position?.coords;

        if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
            return null;
        }

        return {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: typeof coords.accuracy === 'number' ? coords.accuracy : null,
        };
    } catch (err) {
        console.warn('Error capturing proof location:', err);
        return null;
    }
}

/**
 * 把定位和拍摄时间挂进凭证上传的 FormData。
 *
 * 时间只是**对照值**：水印上的时间戳一律用服务端时间，因为改手机时间是真实场景。
 * 两边差得太多时服务端会记进凭证数据，留给运营核对。
 */
export function appendProofContext(form: FormData, location: ProofLocation | null): void {
    form.append('data[captured_at]', new Date().toISOString());

    if (!location) {
        return;
    }

    form.append('data[latitude]', String(location.latitude));
    form.append('data[longitude]', String(location.longitude));

    if (location.accuracy !== null) {
        form.append('data[accuracy]', String(location.accuracy));
    }
}
