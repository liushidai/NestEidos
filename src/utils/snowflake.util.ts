export class SnowflakeUtil {
  private static instance: SnowflakeUtil;
  private workerId: number;
  private datacenterId: number;
  private sequence: number = 0;
  private lastTimestamp: number = 0;

  // 构造函数，初始化机器ID和数据中心ID
  constructor(workerId: number = 1, datacenterId: number = 1) {
    if (workerId > 31 || workerId < 0) {
      throw new Error('workerId must be between 0 and 31');
    }
    if (datacenterId > 31 || datacenterId < 0) {
      throw new Error('datacenterId must be between 0 and 31');
    }

    this.workerId = workerId;
    this.datacenterId = datacenterId;
  }

  // 单例模式获取实例
  public static getInstance(workerId: number = 1, datacenterId: number = 1): SnowflakeUtil {
    if (!SnowflakeUtil.instance) {
      SnowflakeUtil.instance = new SnowflakeUtil(workerId, datacenterId);
    }
    return SnowflakeUtil.instance;
  }

  // 生成下一个ID
  public nextId(): string {
    let timestamp = this.timeGen();

    // 如果当前时间小于上一次ID生成的时间戳，说明系统时钟回退过，应当抛出异常
    if (timestamp < this.lastTimestamp) {
      throw new Error(`Clock moved backwards. Refusing to generate id for ${this.lastTimestamp - timestamp} milliseconds`);
    }

    // 如果是同一时间生成的，则进行毫秒内序列
    if (this.lastTimestamp === timestamp) {
      this.sequence = (this.sequence + 1) & 4095; // 4095 = 0b111111111111 = 2^12 - 1
      if (this.sequence === 0) {
        // 毫秒内序列溢出，阻塞到下一个毫秒
        timestamp = this.tilNextMillis(this.lastTimestamp);
      }
    } else {
      // 时间戳改变，毫秒内序列重置
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;

    // 使用 BigInt 进行位运算，避免 JavaScript 数字精度问题
    const datacenterIdShift = 5n; // 数据中心ID左移位数
    const workerIdShift = 5n + datacenterIdShift; // 机器ID左移位数
    const timestampLeftShift = 12n + workerIdShift; // 时间戳左移位数
    const sequenceMask = 4095n; // 序列号掩码
    const epoch = 1288834974657n; // 雪花算法纪元时间戳

    const id =
      (BigInt(timestamp) - epoch) << timestampLeftShift |
      BigInt(this.datacenterId) << datacenterIdShift |
      BigInt(this.workerId) << workerIdShift |
      (BigInt(this.sequence) & sequenceMask);

    return id.toString();
  }

  // 阻塞到下一个毫秒，直到获得新的时间戳
  private tilNextMillis(lastTimestamp: number): number {
    let timestamp = this.timeGen();
    while (timestamp <= lastTimestamp) {
      timestamp = this.timeGen();
    }
    return timestamp;
  }

  // 返回当前时间戳（毫秒）
  private timeGen(): number {
    return Date.now();
  }
}