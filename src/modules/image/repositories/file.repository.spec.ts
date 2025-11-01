import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from '../entities/file.entity';
import { FileRepository } from './file.repository';
import { SimpleCacheService, TTL_CONFIGS, TTLUtils, CacheKeyUtils, NULL_CACHE_VALUES } from '../../../cache';

describe('FileRepository', () => {
  let repository: FileRepository;
  let fileRepository: Repository<File>;
  let cacheService: SimpleCacheService;

  const mockFile: File = {
    id: 'file123',
    hash: 'abc123',
    fileSize: 1024,
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
    originalKey: 'images/test.jpg',
    webpKey: 'images/test.webp',
    avifKey: 'images/test.avif',
    hasWebp: true,
    hasAvif: true,
    convertWebpParamId: null,
    convertAvifParamId: null,
    createdAt: new Date(),
  } as any;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileRepository,
        {
          provide: getRepositoryToken(File),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: SimpleCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    repository = module.get<FileRepository>(FileRepository);
    fileRepository = module.get<Repository<File>>(getRepositoryToken(File));
    cacheService = module.get<SimpleCacheService>(SimpleCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('应该从缓存返回文件', async () => {
      mockCacheService.get.mockResolvedValue(mockFile);

      const result = await repository.findById('file123');

      expect(result).toEqual(mockFile);
      expect(cacheService.get).toHaveBeenCalledWith('repo:file:id:file123');
      expect(fileRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('应该处理SimpleCacheService返回null的情况（缓存未命中）', async () => {
      mockCacheService.get.mockResolvedValue(null); // SimpleCacheService未命中返回null
      jest.spyOn(fileRepository, 'findOneBy').mockResolvedValue(mockFile);

      const result = await repository.findById('file123');

      expect(result).toEqual(mockFile);
      expect(cacheService.get).toHaveBeenCalledWith('repo:file:id:file123');
      expect(fileRepository.findOneBy).toHaveBeenCalledWith({ id: 'file123' });
      expect(cacheService.set).toHaveBeenCalledWith(
        'repo:file:id:file123',
        mockFile,
        TTLUtils.toSeconds(TTL_CONFIGS.LONG_CACHE)
      );
    });

    it('应该从数据库获取文件并缓存', async () => {
      mockCacheService.get.mockResolvedValue(undefined);
      jest.spyOn(fileRepository, 'findOneBy').mockResolvedValue(mockFile);

      const result = await repository.findById('file123');

      expect(result).toEqual(mockFile);
      expect(cacheService.get).toHaveBeenCalledWith('repo:file:id:file123');
      expect(fileRepository.findOneBy).toHaveBeenCalledWith({ id: 'file123' });
      expect(cacheService.set).toHaveBeenCalledWith(
        'repo:file:id:file123',
        mockFile,
        TTLUtils.toSeconds(TTL_CONFIGS.LONG_CACHE)
      );
    });

    it('当文件不存在时应该返回null', async () => {
      mockCacheService.get.mockResolvedValue(undefined);
      jest.spyOn(fileRepository, 'findOneBy').mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(cacheService.set).toHaveBeenCalledWith(
        'repo:file:id:nonexistent',
        NULL_CACHE_VALUES.NULL_PLACEHOLDER,
        TTLUtils.toSeconds(TTL_CONFIGS.NULL_CACHE)
      );
    });
  });

  describe('findByHash', () => {
    it('应该从缓存返回文件（哈希）', async () => {
      mockCacheService.get.mockResolvedValue(mockFile);

      const result = await repository.findByHash('abc123');

      expect(result).toEqual(mockFile);
      expect(cacheService.get).toHaveBeenCalledWith('repo:file:hash:abc123');
      expect(fileRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('应该处理SimpleCacheService返回null的情况（缓存未命中）', async () => {
      mockCacheService.get.mockResolvedValue(null); // SimpleCacheService未命中返回null
      jest.spyOn(fileRepository, 'findOneBy').mockResolvedValue(mockFile);

      const result = await repository.findByHash('abc123');

      expect(result).toEqual(mockFile);
      expect(cacheService.get).toHaveBeenCalledWith('repo:file:hash:abc123');
      expect(fileRepository.findOneBy).toHaveBeenCalledWith({ hash: 'abc123' });
      expect(cacheService.set).toHaveBeenCalledWith(
        'repo:file:hash:abc123',
        mockFile,
        TTLUtils.toSeconds(TTL_CONFIGS.LONG_CACHE)
      );
    });

    it('应该从数据库获取文件（哈希）并缓存', async () => {
      mockCacheService.get.mockResolvedValue(undefined);
      jest.spyOn(fileRepository, 'findOneBy').mockResolvedValue(mockFile);

      const result = await repository.findByHash('abc123');

      expect(result).toEqual(mockFile);
      expect(cacheService.get).toHaveBeenCalledWith('repo:file:hash:abc123');
      expect(fileRepository.findOneBy).toHaveBeenCalledWith({ hash: 'abc123' });
      expect(cacheService.set).toHaveBeenCalledWith(
        'repo:file:hash:abc123',
        mockFile,
        TTLUtils.toSeconds(TTL_CONFIGS.LONG_CACHE)
      );
    });
  });

  describe('create', () => {
    it('应该创建新文件记录', async () => {
      const createData = {
        hash: 'newhash',
        fileSize: 2048,
      };
      const expectedFile = { ...mockFile, ...createData };

      jest.spyOn(fileRepository, 'create').mockReturnValue(expectedFile as any);
      jest.spyOn(fileRepository, 'save').mockResolvedValue(expectedFile);

      const result = await repository.create(createData);

      expect(result).toEqual(expectedFile);
      expect(fileRepository.create).toHaveBeenCalledWith(createData);
      expect(fileRepository.save).toHaveBeenCalledWith(expectedFile);
      expect(cacheService.delete).toHaveBeenCalledWith('repo:file:hash:newhash');
    });
  });

  describe('delete', () => {
    it('应该删除文件记录并清理缓存', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockFile);
      jest.spyOn(fileRepository, 'remove').mockResolvedValue(mockFile);
      jest.spyOn(repository, 'clearFileCache' as any).mockResolvedValue(undefined);

      await repository.delete('file123');

      expect(fileRepository.remove).toHaveBeenCalledWith(mockFile);
      expect(repository['clearFileCache']).toHaveBeenCalledWith('file123', 'abc123');
    });

    it('当文件不存在时应该抛出错误', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.delete('nonexistent'))
        .rejects.toThrow('文件不存在');
    });
  });

  describe('deleteById', () => {
    it('应该根据ID删除文件记录并返回被删除的文件', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockFile);
      jest.spyOn(fileRepository, 'remove').mockResolvedValue(mockFile);
      jest.spyOn(repository, 'clearFileCache' as any).mockResolvedValue(undefined);

      const result = await repository.deleteById('file123');

      expect(result).toEqual(mockFile);
      expect(fileRepository.remove).toHaveBeenCalledWith(mockFile);
      expect(repository['clearFileCache']).toHaveBeenCalledWith('file123', 'abc123');
    });

    it('当文件不存在时应该返回null', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      const result = await repository.deleteById('nonexistent');

      expect(result).toBeNull();
      expect(fileRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('countByHash', () => {
    it('应该返回指定哈希的文件数量', async () => {
      jest.spyOn(fileRepository, 'count').mockResolvedValue(1);

      const result = await repository.countByHash('abc123');

      expect(result).toBe(1);
      expect(fileRepository.count).toHaveBeenCalledWith({
        where: { hash: 'abc123' },
      });
    });
  });

  describe('缓存清理', () => {
    it('create方法应该清理哈希缓存', async () => {
      const createData = { hash: 'testhash' };
      const expectedFile = { ...mockFile, hash: 'testhash' };

      jest.spyOn(fileRepository, 'create').mockReturnValue(expectedFile as any);
      jest.spyOn(fileRepository, 'save').mockResolvedValue(expectedFile);

      await repository.create(createData);

      expect(cacheService.delete).toHaveBeenCalledWith('repo:file:hash:testhash');
    });

    it('delete方法应该清理相关缓存', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockFile);
      jest.spyOn(fileRepository, 'remove').mockResolvedValue(mockFile);

      await repository.delete('file123');

      expect(cacheService.delete).toHaveBeenCalledWith('repo:file:id:file123');
      expect(cacheService.delete).toHaveBeenCalledWith('repo:file:hash:abc123');
    });
  });

  describe('缓存穿透防护', () => {
    it('应该缓存空值防止缓存穿透 - findById', async () => {
      const cacheKey = 'repo:file:id:nonexistent';

      // 第一次查询 - 缓存未命中，数据库返回null
      jest.spyOn(fileRepository, 'findOneBy').mockResolvedValue(null);
      mockCacheService.get.mockResolvedValue(undefined);

      let result1 = await repository.findById('nonexistent');
      expect(result1).toBeNull();

      // 验证数据库被调用
      expect(fileRepository.findOneBy).toHaveBeenCalledWith({ id: 'nonexistent' });

      // 验证空值被缓存
      expect(mockCacheService.set).toHaveBeenCalledWith(
        cacheKey,
        NULL_CACHE_VALUES.NULL_PLACEHOLDER,
        TTLUtils.toSeconds(TTL_CONFIGS.NULL_CACHE)
      );

      // 第二次查询 - 从缓存获取空值标记
      jest.spyOn(fileRepository, 'findOneBy').mockClear();
      mockCacheService.get.mockResolvedValue(NULL_CACHE_VALUES.NULL_PLACEHOLDER);

      let result2 = await repository.findById('nonexistent');
      expect(result2).toBeNull();

      // 验证数据库不再被调用
      expect(fileRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('应该缓存空值防止缓存穿透 - findByHash', async () => {
      const cacheKey = 'repo:file:hash:nonexistent';

      // 第一次查询 - 缓存未命中，数据库返回null
      jest.spyOn(fileRepository, 'findOneBy').mockResolvedValue(null);
      mockCacheService.get.mockResolvedValue(undefined);

      let result1 = await repository.findByHash('nonexistent');
      expect(result1).toBeNull();

      // 验证数据库被调用
      expect(fileRepository.findOneBy).toHaveBeenCalledWith({ hash: 'nonexistent' });

      // 验证空值被缓存
      expect(mockCacheService.set).toHaveBeenCalledWith(
        cacheKey,
        NULL_CACHE_VALUES.NULL_PLACEHOLDER,
        TTLUtils.toSeconds(TTL_CONFIGS.NULL_CACHE)
      );

      // 第二次查询 - 从缓存获取空值标记
      jest.spyOn(fileRepository, 'findOneBy').mockClear();
      mockCacheService.get.mockResolvedValue(NULL_CACHE_VALUES.NULL_PLACEHOLDER);

      let result2 = await repository.findByHash('nonexistent');
      expect(result2).toBeNull();

      // 验证数据库不再被调用
      expect(fileRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('应该正确识别和返回缓存的空值', async () => {
      // 模拟缓存中存储了空值标记
      mockCacheService.get.mockResolvedValue(NULL_CACHE_VALUES.NULL_PLACEHOLDER);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockCacheService.get).toHaveBeenCalledWith('repo:file:id:nonexistent');
      expect(fileRepository.findOneBy).not.toHaveBeenCalled();
    });
  });
});